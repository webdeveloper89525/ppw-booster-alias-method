// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IChildToken.sol";

contract PolkaPetBooster is VRFConsumerBase, Ownable, ERC1155Holder, ReentrancyGuard, Pausable {
	using SafeERC20 for IERC20;
	using Address for address;

	uint256 internal constant ONE_FIXED_POINT = 1 << 236; // 1 in 20.236 unsigned Fixed Point

	bytes32 internal keyHash;
	uint256 internal fee;

	address public lootBoxNFT;
	IERC1155 public polkapetNFT;

	struct Slot{
		SlotIndex[] index;
	}

	struct SlotIndex{
		NFT nft;
		uint256 prob;  // 20.236 unsigned Fixed Point
		NFT aliasNFT;
	}

	struct NFT{
		uint256 ID;
		uint256 currentQty;
	}

	struct OpenPackPending{
		address user;
		uint256 amount;
	}

	Slot[] slots;

	uint256 availablePacks;

	mapping(uint256 => NFT) nfts;

	mapping(bytes32 => OpenPackPending) public openPackRequests;

	event OpenedPack(
		address indexed recipient,
		uint256[] ids
	);

	event OpenPackRequest(address indexed sender, uint256 amount, bytes32 requestId);

	constructor(
		address _vrfCoordinator,
		address _linkToken,
		address _lootBoxNFT,
		address _polkapetNFT
	)
		VRFConsumerBase(
			_vrfCoordinator, // VRF Coordinator
			_linkToken // LINK Token
		)
	{
		keyHash = 0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4;
		fee = 0.1 * 10**18; // 0.1 LINK (Varies by network)

		lootBoxNFT = _lootBoxNFT;
		polkapetNFT = IERC1155(_polkapetNFT);
	}

	function collectTokens(address tokenAddress, uint256 amount) external onlyOwner {
		require(
			IERC20(tokenAddress).balanceOf(address(this)) >= amount,
			"PolkaPetBooster: insufficient funds"
		);
		IERC20(tokenAddress).safeTransfer(msg.sender, amount);
	}

	function collectNFTs(
		address nftAddress,
		uint256 id,
		uint256 amount
	) external onlyOwner {
		require(
			IERC1155(nftAddress).balanceOf(address(this), id) >= amount,
			"PolkaPetBooster: insufficient funds"
		);
		IERC1155(nftAddress).safeTransferFrom(address(this), msg.sender, id, amount, "");
	}

	function pause() external onlyOwner {
		super._pause();
	}

	function unpause() external onlyOwner {
		super._unpause();
	}

	function openPack(uint256 id, uint256 amount) external whenNotPaused nonReentrant {
		require(IERC1155(lootBoxNFT).balanceOf(msg.sender, id) >= amount, "PolkaPetBooster: insufficient funds");
		require(
			IERC1155(lootBoxNFT).isApprovedForAll(msg.sender, address(this)),
			"PolkaPetBooster: should be approved"
		);
		require(availablePacks >= amount, "PolkaPetBooster: no available packs");

		bytes32 requestId = getRandomNumber();
		openPackRequests[requestId] = OpenPackPending(msg.sender,amount);

		IChildToken(lootBoxNFT).burn(msg.sender, id, amount);
		availablePacks -= amount;

		emit OpenPackRequest(msg.sender, amount, requestId);
	}

	function batchAddCards(
		uint256[][] calldata _cardIDs,
		uint256[][] calldata _quantities,
		uint256[][] memory _probs,  // 20.236 unsigned fixed point
		uint256 totalPacks
	) external whenPaused onlyOwner {
		require(_cardIDs.length == _probs.length, "Number of Slots Mismatch");
		delete slots;
		for(uint256 i = 0; i < _cardIDs.length; i++){
			createNFTObjects(_cardIDs[i], _quantities[i]);
			createSlot(_cardIDs[i],_probs[i],slots.push());
		}
		
		availablePacks = totalPacks;
	}

	function createNFTObjects(uint256[] calldata _cardIDs, uint256[] calldata _quantities) internal {
		for(uint256 i; i < _cardIDs.length; i++){
			NFT storage nft = nfts[_cardIDs[i]];
			nft.ID = _cardIDs[i];
			nft.currentQty += _quantities[i];
		}
	}

	function createSlot(uint256[] calldata _cardIDs, uint256[] memory _probs, Slot storage slot) internal {
		require(_cardIDs.length == _probs.length, "cardID and dropChance arrays mismatch");
		uint256[] memory small = new uint256[](_cardIDs.length);
		uint256[] memory large = new uint256[](_cardIDs.length);
		uint256 smallLength;
		uint256 largeLength;
		for(uint256 i = 0; i < _probs.length; i++){
			_probs[i] = _probs[i] * _probs.length;
			if(_probs[i] < ONE_FIXED_POINT){
				small[smallLength++] = i;
			}
			else{
				large[largeLength++] = i;
			}
		}

		while(smallLength > 0 && largeLength > 0){
			uint256 smallValue = small[--smallLength];
			NFT storage nft = nfts[_cardIDs[smallValue]];
			SlotIndex storage slotIndex = slot.index.push();
			slotIndex.nft = nft;
			slotIndex.prob = _probs[smallValue];

			uint256 largeValue = large[largeLength - 1];
			NFT storage aliasNFT = nfts[_cardIDs[largeValue]];
			slotIndex.aliasNFT = aliasNFT;
			uint256 newProb = (_probs[smallValue] + _probs[largeValue]) - ONE_FIXED_POINT;
			_probs[largeValue] = newProb;
			if(newProb < ONE_FIXED_POINT){
				small[smallLength++] = largeValue;
				largeLength--;
			}
		}
		while(largeLength > 0){
			uint256 largeValue = large[--largeLength];
			NFT storage nft = nfts[_cardIDs[largeValue]];
			SlotIndex storage slotIndex = slot.index.push();
			slotIndex.nft = nft;
			slotIndex.prob = ONE_FIXED_POINT;
		}
		while(smallLength > 0){
			uint256 smallValue = small[--smallLength];
			NFT storage nft = nfts[_cardIDs[smallValue]];
			SlotIndex storage slotIndex = slot.index.push();
			slotIndex.nft = nft;
			slotIndex.prob = ONE_FIXED_POINT;
		}
	}

	/**
	 * Callback function used by VRF Coordinator
	 */
	function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
		fulfillOpenPack(requestId, randomness);
	}

	function fulfillOpenPack(bytes32 requestId, uint256 randomness) internal {
		OpenPackPending storage openPackPending = openPackRequests[requestId];
		address reciepient = openPackPending.user;
		require(reciepient != address(0), "PolkaPetBooster: not registered requestId");
		
		uint256[] memory ids = new uint256[](slots.length);

		for(uint256 i = 0; i < slots.length; i++){
			uint256 random = uint256(keccak256(abi.encode(randomness, i)));
			bool found = false;
			uint256 n = slots[i].index.length;
			uint x;
			uint256 nx;
			uint256 selectedSlotIndex;
			uint256 y;
			assembly{
				x := div(random, ONE_FIXED_POINT)
				nx := mul(x, n)
				selectedSlotIndex := shr(nx, 236)
				y := and(nx, shr(0xff, 20))
			}
			SlotIndex storage slotIndex = slots[i].index[selectedSlotIndex];

			while(! found){	
				if(y < slotIndex.prob){
					NFT storage nft = slotIndex.nft;
					uint256 nftQty;
					assembly{
						nftQty := mload(add(nft.offset, 0x20))
						if gt(nftQty, 0)
						{
							mstore(add(ids, add(0x20, mul(i, 0x20))), sload(nft.slot))
							mstore(add(nft.offset, 0x20), sub(nftQty, 1))
							found := true
						}
					}
					if(nftQty <= 1 && (slotIndex.prob == ONE_FIXED_POINT || slotIndex.aliasNFT.currentQty == 0)){
						slots[i].index[selectedSlotIndex] = slots[i].index[n - 1];
						slots[i].index.pop();
					}
				}
				else{
					NFT storage nft = slotIndex.aliasNFT;
					uint256 nftQty;
					assembly{
						nftQty := mload(add(nft.offset, 0x20))
						if gt(nftQty, 0)
						{
							mstore(add(ids, add(0x20, mul(i, 0x20))), sload(nft.slot))
							mstore(add(nft.offset, 0x20), sub(nftQty, 1))
							found := true
						}
					}
					if(nftQty <= 1 && slotIndex.nft.currentQty == 0){
						slots[i].index[selectedSlotIndex] = slots[i].index[n - 1];
						slots[i].index.pop();	
					}
				}
			}
		}

		//IERC1155(polkapetNFT).safeBatchTransferFrom(address(this), reciepient, ids, amounts, "");

		emit OpenedPack(reciepient, ids);
	}

	/**
	 * Requests randomness from a user-provided seed
	 */
	function getRandomNumber() internal virtual returns (bytes32 requestId) {
		require(
			LINK.balanceOf(address(this)) >= fee,
			"Not enough LINK - fill contract with faucet"
		);
		
		requestId = requestRandomness(keyHash, fee);
	}

	function expand(uint256 randomValue, uint256 n)
		internal
		pure
		returns (uint256[] memory expandedValues)
	{
		uint256 val = uint256(keccak256(abi.encode(randomValue)));
		//expandedValues = new uint256[](n);
		assembly {
			expandedValues := mload(0x40) // 0x40 is the address where next free memory slot is stored in Solidity.
			mstore(expandedValues, n)
			for { let i := 0 } lt(i, n) { i := add(i, 1) } {
				mstore(add(expandedValues, add(0x20, mul(i, 0x20))), val)
			}
		}
	}

	function expandOnce(uint256 randomValue, uint256 n)
		internal
		pure
		returns (uint256)
	{
		return uint256(keccak256(abi.encode(randomValue,n)));
	}	

	function _remove(uint256[] storage array, uint256 index) internal {
		uint256 lastIndex = array.length - 1;

		array[index] = array[lastIndex];
		array.pop();
	}
}

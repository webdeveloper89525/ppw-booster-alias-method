// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../PolkaPetBooster.sol";

contract PolkaPetBoosterMock is PolkaPetBooster {

	uint256 randomnessNonce;

	constructor(
		address _lootBoxNFT,
		address _polkapetNFT
	)
		PolkaPetBooster(
			0x0000000000000000000000000000000000000000,
			0x0000000000000000000000000000000000000000,
			_lootBoxNFT,
			_polkapetNFT
		)
	{}

	/**
	 * Callback function used by VRF Coordinator
	 */
	function fulfillRandomness_(bytes32 requestId, uint256 randomness) external {
		super.fulfillRandomness(requestId, randomness);
	}

	/**
	 * Requests randomness from a user-provided seed
	 */
	function getRandomNumber() internal override returns (bytes32 requestId) {
		requestId = keccak256(abi.encodePacked(randomnessNonce));
		randomnessNonce += 1;
	}

	// function getRandomNumber_(address user) public returns (bytes32 requestId) {
	// 	requestId = getRandomNumber(user);
	// }

	function expand_(uint256 randomValue, uint256 n)
		public
		pure
		returns (uint256[] memory expandedValues)
	{
		expandedValues = new uint256[](n);
		expandedValues = super.expand(randomValue, n);
	}


}

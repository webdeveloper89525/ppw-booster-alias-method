// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IPolkaPetBooster {

	event OpenedPack(
		address indexed recipient,
		uint256 rareCard,
		uint256 basicCard1,
		uint256 basicCard2
	);

	event OpenPackRequest(address indexed sender, bytes32 requestId);

	function collectTokens(address tokenAddress, uint256 amount) external;

	function collectNFTs(
		address nftAddress,
		uint256 id,
		uint256 amount
	) external;

	function pause() external;

	function unpause() external;

	function openPack(uint256 id) external;

	function batchAddCards(
		uint256[] calldata rareIds,
		uint256[] calldata rareAmounts,
		uint256[] calldata basicIds,
		uint256[] calldata basicAmounts
	) external;
}

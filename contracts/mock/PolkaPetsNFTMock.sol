// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract PolkaPetsNFTMock is ERC1155, Ownable {
	constructor()  ERC1155("https://api.digital/api/item/") {}

/*     function mint(address reciepient, uint256 amount) public {
        for (uint256 i = 0; i < 30; i++) {
            _mint(reciepient, i, amount, "");
        }
    } */

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public{
        _mintBatch(to, ids, amounts, data);
    }
}

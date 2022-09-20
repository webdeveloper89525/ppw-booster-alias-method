// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract LootBoxNFTMock is ERC1155 {
	constructor() ERC1155("https://api.digital/api/item/") {}

    function mint(address reciepient, uint256 id, uint256 amount) public {
        _mint(reciepient, id, amount, "");
    }

    function burn(
		address account,
		uint256 id,
		uint256 value
	) public virtual {
		require(
			account == _msgSender() || isApprovedForAll(account, _msgSender()),
			"ChildMintableERC1155: caller is not owner nor approved"
		);
		_burn(account, id, value);
	}
}

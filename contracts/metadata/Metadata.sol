// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

/**
 * @dev Context variant with ERC2771 support.
 */
abstract contract Metadata {
    function tokenURI(uint256 tokenId) virtual external view returns (string memory);
}

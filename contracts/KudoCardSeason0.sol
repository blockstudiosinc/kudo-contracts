// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "./meta-transactions/ERC2771ContextUpdatable.sol";

import "hardhat/console.sol";

/// @custom:security-contact security@kudo.app
contract KudoCardSeason0 is
    ERC721,
    ERC721URIStorage,
    Pausable,
    AccessControl,
    ERC2771ContextUpdatable
{
    using Counters for Counters.Counter;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    Counters.Counter private _tokenIdCounter;

    mapping(string => bool) private _tokenURIs;

    event BatchMinted(address indexed to, string[] tokenURIs);

    constructor()
        ERC721("KUDO Card Season 0", "KUDO")
        ERC2771ContextUpdatable(address(0))
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://";
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function batchMint(address to, string[] calldata tokenURIs)
        public
        onlyRole(MINTER_ROLE)
        returns (uint256[] memory)
    {
        uint256 length = tokenURIs.length;

        uint256[] memory tokenIds = new uint256[](length);

        for (uint256 i = 0; i < length; ++i) {
            safeMint(to, tokenURIs[i]);
        }

        emit BatchMinted(to, tokenURIs);

        return tokenIds;
    }

    function safeMint(address to, string memory uri)
        public
        onlyRole(MINTER_ROLE)
    {
        require(_tokenURIs[uri] == false, "Already minted tokenURI");

        uint256 tokenId = _tokenIdCounter.current();
        // TODO: increment first for easier null check?
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        // Prevent duplicate URIs
        _tokenURIs[uri] = true;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    // The following functions are overrides required by Solidity.

    function _burn(uint256 tokenId)
        internal
        override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // Overrides for ERC2771ContextUpdatable for meta transactions

    function _msgSender()
        internal
        view
        override(ERC2771ContextUpdatable, Context)
        returns (address sender)
    {
        return ERC2771ContextUpdatable._msgSender();
    }

    function _msgData()
        internal
        view
        override(ERC2771ContextUpdatable, Context)
        returns (bytes calldata)
    {
        return ERC2771ContextUpdatable._msgData();
    }
}

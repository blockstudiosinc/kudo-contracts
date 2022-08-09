// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "hardhat/console.sol";

/// @custom:security-contact security@kudo.app
contract KudoCardSeason0 is ERC721, ERC721URIStorage, Pausable, AccessControl {
    using Counters for Counters.Counter;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    Counters.Counter private _tokenIdCounter;

    mapping(string => bool) private _tokenURIs;
    bool public hasRevokedSetTokenURI = false;

    event BatchMinted(address indexed to, string[] tokenURIs);
    event TokenURIsUpdated(
        address indexed updater,
        uint256[] tokenIds,
        string[] tokenURIs
    );
    event RevokedSetTokenURI(address indexed revoker);

    constructor() ERC721("KUDO Card Season 0", "KUDO") {
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

        // Prevent duplicate URIs
        _tokenURIs[uri] = true;

        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    // TokenURI updating

    function setTokenURIs(
        uint256[] calldata tokenIds,
        string[] calldata tokenURIs
    ) external onlyRole(MINTER_ROLE) {
        require(hasRevokedSetTokenURI == false, "Revoked ability");
        require(tokenIds.length > 0 && tokenURIs.length > 0, "Invalid data");
        require(tokenIds.length == tokenURIs.length, "Data mismatch");

        for (uint256 i = 0; i < tokenIds.length; ++i) {
            _setTokenURI(tokenIds[i], tokenURIs[i]);
        }

        emit TokenURIsUpdated(msg.sender, tokenIds, tokenURIs);
    }

    function revokeSetTokenURI() external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(hasRevokedSetTokenURI == false, "Already revoked");

        hasRevokedSetTokenURI = true;
        emit RevokedSetTokenURI(msg.sender);
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
}

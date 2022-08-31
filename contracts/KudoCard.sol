// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@ensdomains/ens-contracts/contracts/ethregistrar/StringUtils.sol";
import "contracts/utils/Substring.sol";

import "hardhat/console.sol";

/// @custom:security-contact security@kudo.app
contract KudoCard is
    ERC721,
    ERC721URIStorage,
    ERC2981,
    Pausable,
    AccessControl
{
    using Counters for Counters.Counter;
    using StringUtils for string;
    using Substring for string;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    Counters.Counter private _tokenIdCounter;

    mapping(string => uint256) public tokenURIs;
    mapping(address => bool) public approvedMarkets;

    bool public hasRevokedSetTokenURI = false;
    bool public hasRevokedUpdateApprovedMarkets = false;

    string private contractMetadataURL = "";

    event BatchMinted(
        address indexed to,
        uint256[] tokenIds,
        string[] tokenURIs
    );
    event TokenURIsUpdated(
        address indexed updater,
        uint256[] tokenIds,
        string[] tokenURIs
    );
    event RevokedSetTokenURI(address indexed revoker);
    event RoyaltyUpdated(
        address indexed updater,
        address indexed receiver,
        uint256 indexed feeNumerator
    );
    event ApprovedMarketUpdated(
        address indexed updater,
        address indexed market,
        bool indexed approved
    );
    event RevokedUpdateApprovedMarkets(address indexed revoker);
    event ContractMetadataURLUpdated(
        address indexed updater,
        string indexed url
    );

    constructor() ERC721("KUDO Card", "KUDO") {
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

    function batchMint(address to, string[] calldata uris)
        public
        onlyRole(MINTER_ROLE)
        returns (uint256[] memory)
    {
        uint256 length = uris.length;

        uint256[] memory tokenIds = new uint256[](length);

        for (uint256 i = 0; i < length; ++i) {
            uint256 tokenId = safeMint(to, uris[i]);
            tokenIds[i] = tokenId;
        }

        emit BatchMinted(to, tokenIds, uris);

        return tokenIds;
    }

    function safeMint(address to, string memory uri)
        public
        onlyRole(MINTER_ROLE)
        returns (uint256)
    {
        require(tokenURIs[uri] == 0, "Already minted tokenURI");

        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        // Prevent duplicate URIs
        tokenURIs[uri] = tokenId;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        return tokenId;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    // Auto-approve select marketplaces to save gas and better UX

    function setApprovedMarket(address market, bool approved)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(hasRevokedUpdateApprovedMarkets == false, "Ability revoked");

        approvedMarkets[market] = approved;
        emit ApprovedMarketUpdated(msg.sender, market, approved);
    }

    function isApprovedForAll(address owner, address operator)
        public
        view
        override
        returns (bool)
    {
        if (approvedMarkets[operator]) {
            return true;
        }

        return ERC721.isApprovedForAll(owner, operator);
    }

    function revokeUpdateApprovedMarkets()
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(hasRevokedUpdateApprovedMarkets == false, "Already revoked");

        hasRevokedUpdateApprovedMarkets = true;
        emit RevokedUpdateApprovedMarkets(msg.sender);
    }

    // TokenURI updating

    function setTokenURIs(uint256[] calldata tokenIds, string[] calldata uris)
        external
        onlyRole(MINTER_ROLE)
    {
        require(hasRevokedSetTokenURI == false, "Revoked ability");
        require(tokenIds.length > 0 && uris.length > 0, "Invalid data");
        require(tokenIds.length == uris.length, "Data mismatch");

        uint256 prefixLength = _baseURI().strlen();

        for (uint256 i = 0; i < tokenIds.length; ++i) {
            uint256 tokenId = tokenIds[i];

            // Contains baseURI prefix
            string memory fullOldURI = tokenURI(tokenId);
            string memory oldURI = fullOldURI.substring(
                prefixLength,
                fullOldURI.strlen()
            );
            tokenURIs[oldURI] = 0;

            string calldata newURI = uris[i];
            _setTokenURI(tokenIds[i], newURI);
            tokenURIs[newURI] = tokenId;
        }

        emit TokenURIsUpdated(msg.sender, tokenIds, uris);
    }

    function revokeSetTokenURI() external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(hasRevokedSetTokenURI == false, "Already revoked");

        hasRevokedSetTokenURI = true;
        emit RevokedSetTokenURI(msg.sender);
    }

    // Royalties

    function setDefaultRoyalty(address receiver, uint96 feeNumerator)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(feeNumerator <= 1000, "Fee too high");

        _setDefaultRoyalty(receiver, feeNumerator);
        emit RoyaltyUpdated(msg.sender, receiver, feeNumerator);
    }

    // Contract metadata for markets

    function contractURI() public view returns (string memory) {
        return contractMetadataURL;
    }

    function setContractMetadataURL(string memory url)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(
            keccak256(bytes(contractMetadataURL)) != keccak256(bytes(url)),
            "No change"
        );

        contractMetadataURL = url;
        emit ContractMetadataURLUpdated(msg.sender, url);
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
        override(ERC2981, ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

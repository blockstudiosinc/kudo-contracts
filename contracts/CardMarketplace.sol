// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./meta-transactions/ERC2771ContextUpdatable.sol";
import "./KudoCard.sol";

import "hardhat/console.sol";

/// @custom:security-contact security@kudo.app
contract CardMarketplace is ERC2771ContextUpdatable, ReentrancyGuard {
    using Counters for Counters.Counter;

    KudoCard public immutable kudoCard;
    IERC20 public immutable mUSDC;

    Counters.Counter public _listingIds;

    struct Listing {
        uint256 listingId;
        uint256 tokenId;
        uint256 price;
        address seller;
        bool isActive;
        bool isSold;
    }
    mapping(uint256 => Listing) public listings;

    bool public listingIsPaused = false;
    bool public marketIsPaused = false;

    event CardListed(
        uint256 listingId,
        address indexed seller,
        uint256 indexed tokenId,
        uint256 indexed price
    );
    event CardDelisted(
        uint256 indexed listingId,
        address indexed seller,
        uint256 indexed tokenId
    );
    event CardSold(
        uint256 listingId,
        address indexed seller,
        address indexed buyer,
        uint256 indexed price
    );
    event ListingPaused(address indexed pauser, bool indexed isPaused);
    event MarketPaused(address indexed pauser, bool indexed isPaused);

    constructor(
        address _kudoCard,
        address _mUSDC,
        address _trustedForwarder
    ) ERC2771ContextUpdatable(_trustedForwarder) {
        kudoCard = KudoCard(_kudoCard);
        mUSDC = IERC20(_mUSDC);
    }

    function list(uint256 tokenId, uint256 price) external nonReentrant {
        require(marketIsPaused == false, "Market paused");
        require(listingIsPaused == false, "New listings paused");

        address seller = _msgSender();

        require(seller == kudoCard.ownerOf(tokenId), "Not card owner");
        require(price != 0, "Price can't be 0");

        _listingIds.increment();
        uint256 listingId = _listingIds.current();

        listings[listingId] = Listing(
            listingId,
            tokenId,
            price,
            seller,
            true,
            false
        );

        kudoCard.transferFrom(seller, address(this), tokenId);

        emit CardListed(listingId, seller, tokenId, price);
    }

    function delist(uint256 listingId) external nonReentrant {
        require(marketIsPaused == false, "Market paused");

        Listing storage listing = listings[listingId];

        require(listing.isActive == true, "Invalid listing");

        address seller = _msgSender();
        require(listing.seller == seller, "Not the seller");

        listing.isActive = false;
        kudoCard.transferFrom(address(this), listing.seller, listing.tokenId);

        emit CardDelisted(listingId, seller, listing.tokenId);
    }

    function buy(uint256 listingId) external nonReentrant {
        require(marketIsPaused == false, "Market paused");

        Listing storage listing = listings[listingId];

        address buyer = _msgSender();

        require(listing.isActive, "Invalid listing");
        require(listing.seller != buyer, "Buyer is seller");
        require(listing.isSold == false, "Already sold");

        listing.isActive = false;
        listing.isSold = true;

        // Transfer payment
        (address royaltyWallet, uint256 royaltyAmount) = kudoCard.royaltyInfo(
            listing.tokenId,
            listing.price
        );
        require(royaltyWallet != address(0), "Royalty not set");

        uint256 sellerAmount = listing.price - royaltyAmount;

        // Extra precaution
        require(
            sellerAmount <= listing.price && royaltyAmount < sellerAmount,
            "Invalid royalties"
        );

        mUSDC.transferFrom(buyer, listing.seller, sellerAmount);
        mUSDC.transferFrom(buyer, royaltyWallet, royaltyAmount);

        // Transfer the NFT
        kudoCard.safeTransferFrom(address(this), buyer, listing.tokenId);

        emit CardSold(listingId, listing.seller, buyer, listing.price);
    }

    function getListings(address seller)
        external
        view
        returns (Listing[] memory)
    {
        uint256 sellerCount = 0;
        for (uint256 i = 1; i <= _listingIds.current(); ++i) {
            if (listings[i].seller == seller) {
                ++sellerCount;
            }
        }

        Listing[] memory userListings = new Listing[](sellerCount);

        uint256 index = 0;

        for (uint256 i = 1; i <= _listingIds.current(); ++i) {
            Listing memory listing = listings[i];

            if (listing.seller == seller) {
                userListings[index] = listing;
                ++index;
            }
        }

        return userListings;
    }

    // Pausing

    function pauseListings(bool isPaused)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(listingIsPaused != isPaused, "No change");

        listingIsPaused = isPaused;
        emit ListingPaused(msg.sender, isPaused);
    }

    function pauseMarket(bool isPaused) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(marketIsPaused != isPaused, "No change");

        marketIsPaused = isPaused;
        emit MarketPaused(msg.sender, isPaused);
    }

    // ERC2771ContextUpdatable overrides for meta transactions

    function _msgSender()
        internal
        view
        override(ERC2771ContextUpdatable)
        returns (address sender)
    {
        return ERC2771ContextUpdatable._msgSender();
    }

    function _msgData()
        internal
        view
        override(ERC2771ContextUpdatable)
        returns (bytes calldata)
    {
        return ERC2771ContextUpdatable._msgData();
    }
}

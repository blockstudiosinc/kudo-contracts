// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./meta-transactions/ERC2771ContextUpdatable.sol";
import "./KudoCardSeason0.sol";

import "hardhat/console.sol";

/// @custom:security-contact security@kudo.app
contract CardMarketplace is ERC2771ContextUpdatable, ReentrancyGuard {
    using Counters for Counters.Counter;

    KudoCardSeason0 public immutable kudoCard;
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

    event CardListed(
        uint256 listingId,
        address indexed seller,
        uint256 indexed tokenId,
        uint256 indexed price
    );
    event CardDelisted(uint256 indexed listingId, address indexed seller);
    event CardSold(
        uint256 listingId,
        address indexed seller,
        address indexed buyer,
        uint256 indexed price
    );

    constructor(
        address _kudoCard,
        address _mUSDC,
        address _trustedForwarder
    ) ERC2771ContextUpdatable(_trustedForwarder) {
        kudoCard = KudoCardSeason0(_kudoCard);
        mUSDC = IERC20(_mUSDC);
    }

    // todo access control

    function list(uint256 tokenId, uint256 price) external nonReentrant {
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
        Listing storage listing = listings[listingId];

        require(listing.isActive == true, "Invalid listing");

        address seller = _msgSender();
        require(listing.seller == seller, "Not the seller");

        listing.isActive = false;
        kudoCard.transferFrom(address(this), listing.seller, listing.tokenId);

        emit CardDelisted(listingId, seller);
    }

    function buy(uint256 listingId) external nonReentrant {
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

        uint256 sellerAmount = listing.price - royaltyAmount;

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

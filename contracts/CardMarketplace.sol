// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./KudoCardSeason0.sol";

import "hardhat/console.sol";

/// @custom:security-contact security@kudo.app
contract CardMarketplace is ReentrancyGuard {
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
    }
    mapping(uint256 => Listing) public listings;

    event CardListed(
        address indexed seller,
        uint256 indexed tokenId,
        uint256 indexed price
    );

    constructor(address _kudoCard, address _mUSDC) {
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

        listings[listingId] = Listing(listingId, tokenId, price, seller, true);

        kudoCard.transferFrom(seller, address(this), tokenId);

        emit CardListed(seller, tokenId, price);
    }

    // TODO: Add relayer functionality
    function _msgSender() internal view returns (address) {
        return msg.sender;
    }
}

//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

//  __                        __           
// /  |                      /  |          
// $$ |   __  __    __   ____$$ |  ______  
// $$ |  /  |/  |  /  | /    $$ | /      \ 
// $$ |_/$$/ $$ |  $$ |/$$$$$$$ |/$$$$$$  |
// $$   $$<  $$ |  $$ |$$ |  $$ |$$ |  $$ |
// $$$$$$  \ $$ \__$$ |$$ \__$$ |$$ \__A$ |
// $$ | $$  |$$    $$/ $$    $$ |$$    B$/ 
// $$/   $$/  $$$$$$/   $$$$$$$/  $$$$$$/  

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../metadata/Metadata.sol";

import "hardhat/console.sol";

contract Kudo is ERC721, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private tokenCounter;
    using Strings for uint256; 
    string private baseURI;
    address public metadataAddress;
    uint256 public constant MAX_PER_WALLET = 1;
    uint256 public max;
    uint256 public constant PUBLIC_SALE_PRICE = 0.1 ether;
    event NewMint(address, uint256);

    // ============ ACCESS CONTROL/SANITY MODIFIERS ============

    modifier canMint() {
      require(
        tokenCounter.current() + 1 <= max,
        "Not enough remaining to mint"
      );
      _;
    }

    modifier isCorrectPayment(uint256 price) {
      require(
        price * 1 == msg.value,
        "Incorrect ETH value sent"
      );
      _;
    }

    modifier maxPerWallet() {
      require(
          balanceOf(msg.sender) + 1 <= MAX_PER_WALLET,
          "Max able to mint is one"
      );
      _;
    }

    constructor(
      uint256 _max
    ) ERC721("Kudo", "KUDO") {
      max = _max;
      baseURI = "ipfs://QmYjacJoxdBmbRj9fgYuLBTdwY6RugW2XZvcQ9rcXcnnTN/";
      uint256 tokenId = nextTokenId();
      _safeMint(msg.sender, tokenId);
      emit NewMint(msg.sender, tokenId);
    }

    function mint()
      external
      payable
      nonReentrant
      isCorrectPayment(PUBLIC_SALE_PRICE)
      canMint()
      maxPerWallet()
    {
      uint256 tokenId = nextTokenId();
      _safeMint(msg.sender, tokenId);
      emit NewMint(msg.sender, tokenId);
    }

    function setMetadataAddress(address addr) external onlyOwner {
        metadataAddress = addr;
    }
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return Metadata(metadataAddress).tokenURI(tokenId);
    }

    // ============ PUBLIC READ-ONLY FUNCTIONS ============

    function getBaseURI() external view returns (string memory) {
      return baseURI;
    }

    function getLastTokenId() external view returns (uint256) {
      return tokenCounter.current();
    }

    // ============ OWNER-ONLY ADMIN FUNCTIONS ============

    function setBaseURI(string memory _baseURI) external onlyOwner {
      baseURI = _baseURI;
    }

    function withdraw() public onlyOwner {
      uint256 balance = address(this).balance;
      payable(msg.sender).transfer(balance);
    }

    function withdrawTokens(IERC20 token) public onlyOwner {
      uint256 balance = token.balanceOf(address(this));
      token.transfer(msg.sender, balance);
    }


    // ============ SUPPORTING FUNCTIONS ============

    function nextTokenId() private returns (uint256) {
      tokenCounter.increment();
      return tokenCounter.current();
    }

    // ============= OVERRIDES ====================
    
    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function normieTokenURI(uint256 tokenId)
      public
      view
      virtual
      returns (string memory)
    {
      require(_exists(tokenId), "Nonexistent token");
      return string(abi.encodePacked(baseURI, "/", tokenId.toString()));
    }
    receive() external payable {}
}
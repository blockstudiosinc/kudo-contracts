// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.7.0) (metatx/ERC2771Context.sol)
//
// [KUDO] Updatable version of https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.7.1/contracts/metatx/ERC2771Context.sol

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @dev Context variant with ERC2771 support.
 */
abstract contract ERC2771ContextUpdatable is Context, AccessControl {
    address public trustedForwarder;

    event ForwarderUpdated(address indexed forwarder);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address forwarder) {
        trustedForwarder = forwarder;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function updateTrustedForwarder(address newForwarder)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(newForwarder != address(0), "Invalid forwarder address");
        require(trustedForwarder != newForwarder, "Already the forwarder");

        trustedForwarder = newForwarder;

        emit ForwarderUpdated(newForwarder);
    }

    function isTrustedForwarder(address forwarder)
        public
        view
        virtual
        returns (bool)
    {
        return forwarder == trustedForwarder;
    }

    function _msgSender()
        internal
        view
        virtual
        override
        returns (address sender)
    {
        if (isTrustedForwarder(msg.sender)) {
            // The assembly code is more direct than the Solidity version using `abi.decode`.
            /// @solidity memory-safe-assembly
            assembly {
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            return super._msgSender();
        }
    }

    function _msgData()
        internal
        view
        virtual
        override
        returns (bytes calldata)
    {
        if (isTrustedForwarder(msg.sender)) {
            return msg.data[:msg.data.length - 20];
        } else {
            return super._msgData();
        }
    }
}

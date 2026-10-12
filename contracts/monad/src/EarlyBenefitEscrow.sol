// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @notice Native test MON rewards; source eligibility is trusted to the off-chain signer.
contract EarlyBenefitEscrow is EIP712, ReentrancyGuard, Ownable2Step {
    struct Benefit {
        address creator;
        uint256 payout;
        uint256 capacity;
        uint256 expiry;
        bytes32 ruleHash;
        uint256 ruleVersion;
        uint256 funded;
        uint256 paid;
        uint256 refunded;
        uint256 remaining;
        uint256 claims;
        bool closed;
    }

    struct Authorization {
        uint256 benefitId;
        address beneficiary;
        uint256 amount;
        uint256 expiry;
        bytes32 sourceNullifier;
        bytes32 ruleHash;
        uint256 ruleVersion;
        uint256 signerEpoch;
    }
    bytes32 public constant AUTHORIZATION_TYPEHASH = keccak256(
        "Authorization(uint256 benefitId,address beneficiary,uint256 amount,uint256 expiry,bytes32 sourceNullifier,bytes32 ruleHash,uint256 ruleVersion,uint256 signerEpoch)"
    );
    address public eligibilitySigner;
    uint256 public signerEpoch = 1;
    uint256 public nextBenefitId = 1;
    uint256 public totalLiability;
    mapping(uint256 => Benefit) public benefits;
    mapping(uint256 => mapping(bytes32 => bool)) public consumed;
    mapping(uint256 => mapping(address => bool)) public claimedWallet;

    error InvalidTerms();
    error NotCreator();
    error WindowClosed();
    error InvalidAuthorization();
    error AlreadyClaimed();
    error InsufficientFunding();
    error TransferFailed();
    error RefundUnavailable();

    event BenefitCreated(
        uint256 indexed benefitId,
        address indexed creator,
        uint256 payout,
        uint256 capacity,
        uint256 expiry,
        bytes32 ruleHash,
        uint256 ruleVersion
    );
    event BenefitFunded(uint256 indexed benefitId, address indexed creator, uint256 amount, uint256 remaining);
    event BenefitClaimed(
        uint256 indexed benefitId,
        address indexed beneficiary,
        bytes32 indexed sourceNullifier,
        uint256 amount,
        uint256 remaining,
        uint256 claims
    );
    event BenefitClosed(uint256 indexed benefitId, address indexed creator, uint256 refund);
    event SignerRotated(address indexed signer, uint256 epoch);

    constructor(address admin, address signer) Ownable(admin) EIP712("EarlyBenefitEscrow", "1") {
        if (signer == address(0)) revert InvalidTerms();
        eligibilitySigner = signer;
    }

    function renounceOwnership() public view override onlyOwner {
        revert InvalidTerms();
    }

    function transferOwnership(address newOwner) public override onlyOwner {
        if (newOwner == address(0)) revert InvalidTerms();
        super.transferOwnership(newOwner);
    }

    /// @notice Rotation immediately invalidates all outstanding authorizations.
    function setEligibilitySigner(address signer) external onlyOwner {
        if (signer == address(0) || signer == eligibilitySigner) revert InvalidTerms();
        eligibilitySigner = signer;
        signerEpoch++;
        emit SignerRotated(signer, signerEpoch);
    }

    function createBenefit(uint256 payout, uint256 capacity, uint256 expiry, bytes32 ruleHash, uint256 ruleVersion)
        external
        payable
        nonReentrant
        returns (uint256 id)
    {
        if (
            payout == 0 || capacity == 0 || expiry <= block.timestamp || ruleHash == bytes32(0) || ruleVersion == 0
                || capacity > type(uint256).max / payout || msg.value > payout * capacity
        ) revert InvalidTerms();
        id = nextBenefitId++;
        benefits[id] =
            Benefit(msg.sender, payout, capacity, expiry, ruleHash, ruleVersion, msg.value, 0, 0, msg.value, 0, false);
        totalLiability += msg.value;
        emit BenefitCreated(id, msg.sender, payout, capacity, expiry, ruleHash, ruleVersion);
        if (msg.value > 0) emit BenefitFunded(id, msg.sender, msg.value, msg.value);
    }

    function fund(uint256 id) external payable nonReentrant {
        Benefit storage b = benefits[id];
        if (b.creator != msg.sender) revert NotCreator();
        if (b.closed || block.timestamp >= b.expiry) revert WindowClosed();
        if (msg.value == 0 || msg.value > b.payout * b.capacity - b.funded) revert InvalidTerms();
        b.funded += msg.value;
        b.remaining += msg.value;
        totalLiability += msg.value;
        emit BenefitFunded(id, msg.sender, msg.value, b.remaining);
    }

    function authorizationDigest(Authorization calldata a) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    AUTHORIZATION_TYPEHASH,
                    a.benefitId,
                    a.beneficiary,
                    a.amount,
                    a.expiry,
                    a.sourceNullifier,
                    a.ruleHash,
                    a.ruleVersion,
                    a.signerEpoch
                )
            )
        );
    }

    /// @notice Anyone may relay; only the signed beneficiary receives funds.
    function claim(Authorization calldata a, bytes calldata signature) external nonReentrant {
        Benefit storage b = benefits[a.benefitId];
        if (b.creator == address(0) || b.closed || block.timestamp >= b.expiry || block.timestamp >= a.expiry) {
            revert WindowClosed();
        }
        if (
            a.beneficiary == address(0) || a.sourceNullifier == bytes32(0) || a.amount != b.payout
                || a.expiry > b.expiry || a.ruleHash != b.ruleHash || a.ruleVersion != b.ruleVersion
                || a.signerEpoch != signerEpoch || ECDSA.recover(authorizationDigest(a), signature) != eligibilitySigner
        ) revert InvalidAuthorization();
        if (consumed[a.benefitId][a.sourceNullifier] || claimedWallet[a.benefitId][a.beneficiary]) {
            revert AlreadyClaimed();
        }
        if (b.claims >= b.capacity || b.remaining < a.amount) revert InsufficientFunding();
        consumed[a.benefitId][a.sourceNullifier] = true;
        claimedWallet[a.benefitId][a.beneficiary] = true;
        b.claims++;
        b.paid += a.amount;
        b.remaining -= a.amount;
        totalLiability -= a.amount;
        (bool ok,) = a.beneficiary.call{value: a.amount}("");
        if (!ok) revert TransferFailed();
        emit BenefitClaimed(a.benefitId, a.beneficiary, a.sourceNullifier, a.amount, b.remaining, b.claims);
    }

    function close(uint256 id) external nonReentrant {
        Benefit storage b = benefits[id];
        if (b.creator != msg.sender) revert NotCreator();
        if (b.closed || block.timestamp < b.expiry) revert RefundUnavailable();
        uint256 amount = b.remaining;
        b.closed = true;
        b.remaining = 0;
        b.refunded += amount;
        totalLiability -= amount;
        if (amount > 0) {
            (bool ok,) = b.creator.call{value: amount}("");
            if (!ok) revert TransferFailed();
        }
        emit BenefitClosed(id, msg.sender, amount);
    }
}

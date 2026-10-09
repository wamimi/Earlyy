// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;
import {EarlyBenefitEscrow as Escrow} from "../src/EarlyBenefitEscrow.sol";

interface Vm {
    function addr(uint256) external returns (address);
    function sign(uint256, bytes32) external returns (uint8, bytes32, bytes32);
    function deal(address, uint256) external;
    function prank(address) external;
    function warp(uint256) external;
    function chainId(uint256) external;
    function expectRevert() external;
    function expectRevert(bytes4) external;
}

contract Receiver {
    Escrow public escrow;
    uint256 public refundId;
    bool public reject;
    bool public attacked;
    bool public reentered;

    constructor(Escrow e) {
        escrow = e;
    }

    function configure(uint256 id, bool r) external {
        refundId = id;
        reject = r;
    }

    function create(uint256 expiry) external payable returns (uint256) {
        return escrow.createBenefit{value: msg.value}(1 ether, 1, expiry, bytes32(uint256(1)), 1);
    }

    function close() external {
        escrow.close(refundId);
    }

    receive() external payable {
        require(!reject, "receiver rejected");
        attacked = true;
        (reentered,) = address(escrow).call(abi.encodeCall(escrow.close, (refundId)));
    }
}

contract EscrowTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    Escrow e;
    uint256 constant KEY = 0xA11CE;
    address signer;
    address fan = address(0xB0B);
    bytes32 constant RULE = keccak256("rule");
    receive() external payable {}

    function setUp() public {
        vm.chainId(10143);
        vm.warp(1000);
        vm.deal(address(this), 100 ether);
        signer = vm.addr(KEY);
        e = new Escrow(address(this), signer);
    }

    function create(uint256 value, uint256 cap, uint256 expiry) internal returns (uint256) {
        return e.createBenefit{value: value}(1 ether, cap, expiry, RULE, 1);
    }

    function auth(uint256 id, address who, bytes32 n) internal view returns (Escrow.Authorization memory) {
        return Escrow.Authorization(id, who, 1 ether, 1900, n, RULE, 1, e.signerEpoch());
    }

    function sig(Escrow.Authorization memory a) internal returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(KEY, e.authorizationDigest(a));
        return abi.encodePacked(r, s, v);
    }

    function check(uint256 id, uint256 expectedRemaining, uint256 expectedClaims) internal view {
        (,,,,,, uint256 funded, uint256 paid, uint256 refunded, uint256 remaining, uint256 claims,) = e.benefits(id);
        require(funded == paid + refunded + remaining, "conservation");
        require(remaining == expectedRemaining && claims == expectedClaims, "state");
        require(e.totalLiability() <= address(e).balance, "solvent");
    }

    function testCreateFundClaimRefund() public {
        uint256 id = create(1 ether, 2, 2000);
        e.fund{value: 1 ether}(id);
        Escrow.Authorization memory a = auth(id, fan, bytes32(uint256(1)));
        e.claim(a, sig(a));
        require(fan.balance == 1 ether);
        check(id, 1 ether, 1);
        vm.warp(2000);
        e.close(id);
        check(id, 0, 1);
    }

    function testZeroInvalidTermsAndConstructor() public {
        vm.expectRevert();
        new Escrow(address(0), signer);
        vm.expectRevert();
        new Escrow(address(this), address(0));
        vm.expectRevert();
        e.createBenefit(0, 1, 2000, RULE, 1);
        vm.expectRevert();
        e.createBenefit(1, 0, 2000, RULE, 1);
        vm.expectRevert();
        create(0, 1, 1000);
        vm.expectRevert();
        e.createBenefit(1, 1, 2000, bytes32(0), 1);
        vm.expectRevert();
        e.createBenefit(1, 1, 2000, RULE, 0);
        vm.expectRevert();
        e.createBenefit(type(uint256).max, 2, 2000, RULE, 1);
        vm.expectRevert();
        create(2 ether, 1, 2000);
    }

    function testEverySignedFieldMutation() public {
        uint256 id = create(3 ether, 3, 2000);
        create(1 ether, 1, 2000);
        Escrow.Authorization memory a = auth(id, fan, bytes32(uint256(1)));
        bytes memory signature = sig(a);
        a.benefitId = 2;
        vm.expectRevert();
        e.claim(a, signature);
        a.benefitId = id;
        a.beneficiary = address(0x123);
        vm.expectRevert();
        e.claim(a, signature);
        a.beneficiary = fan;
        a.amount++;
        vm.expectRevert();
        e.claim(a, signature);
        a.amount--;
        a.expiry++;
        vm.expectRevert();
        e.claim(a, signature);
        a.expiry--;
        a.sourceNullifier = bytes32(uint256(2));
        vm.expectRevert();
        e.claim(a, signature);
        a.sourceNullifier = bytes32(uint256(1));
        a.ruleHash = bytes32(uint256(2));
        vm.expectRevert();
        e.claim(a, signature);
        a.ruleHash = RULE;
        a.ruleVersion++;
        vm.expectRevert();
        e.claim(a, signature);
        a.ruleVersion--;
        a.signerEpoch++;
        vm.expectRevert();
        e.claim(a, signature);
        a.signerEpoch--;
        e.claim(a, signature);
        check(id, 2 ether, 1);
    }

    function testWrongSignerAndMalformedSignature() public {
        uint256 id = create(1 ether, 1, 2000);
        Escrow.Authorization memory a = auth(id, fan, bytes32(uint256(1)));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(42, e.authorizationDigest(a));
        vm.expectRevert();
        e.claim(a, abi.encodePacked(r, s, v));
        vm.expectRevert();
        e.claim(a, hex"00");
    }

    function testHighSSignatureRejected() public {
        uint256 id = create(1 ether, 1, 2000);
        Escrow.Authorization memory a = auth(id, fan, bytes32(uint256(1)));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(KEY, e.authorizationDigest(a));
        s = bytes32(0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141 - uint256(s));
        vm.expectRevert();
        e.claim(a, abi.encodePacked(r, s, v == 27 ? uint8(28) : uint8(27)));
    }

    function testCrossChainAndContractReplay() public {
        uint256 id = create(1 ether, 1, 2000);
        Escrow.Authorization memory a = auth(id, fan, bytes32(uint256(1)));
        bytes memory signature = sig(a);
        vm.chainId(1);
        vm.expectRevert();
        e.claim(a, signature);
        vm.chainId(10143);
        Escrow other = new Escrow(address(this), signer);
        other.createBenefit{value: 1 ether}(1 ether, 1, 2000, RULE, 1);
        vm.expectRevert();
        other.claim(a, signature);
    }

    function testDuplicateSourceAcrossWalletsAndWalletAcrossSources() public {
        uint256 id = create(3 ether, 3, 2000);
        Escrow.Authorization memory a = auth(id, fan, bytes32(uint256(1)));
        e.claim(a, sig(a));
        a.beneficiary = address(0x123);
        bytes memory s = sig(a);
        vm.expectRevert(Escrow.AlreadyClaimed.selector);
        e.claim(a, s);
        a.beneficiary = fan;
        a.sourceNullifier = bytes32(uint256(2));
        s = sig(a);
        vm.expectRevert(Escrow.AlreadyClaimed.selector);
        e.claim(a, s);
        check(id, 2 ether, 1);
    }

    function testExpiryBoundaries() public {
        uint256 id = create(2 ether, 2, 2000);
        Escrow.Authorization memory a = auth(id, fan, bytes32(uint256(1)));
        bytes memory s = sig(a);
        vm.warp(1899);
        e.claim(a, s);
        a.beneficiary = address(0x123);
        a.sourceNullifier = bytes32(uint256(2));
        s = sig(a);
        vm.warp(1900);
        vm.expectRevert(Escrow.WindowClosed.selector);
        e.claim(a, s);
        a.expiry = 2000;
        s = sig(a);
        vm.warp(1999);
        vm.expectRevert(Escrow.RefundUnavailable.selector);
        e.close(id);
        vm.warp(2000);
        vm.expectRevert(Escrow.WindowClosed.selector);
        e.claim(a, s);
        e.close(id);
        vm.warp(2001);
        vm.expectRevert();
        e.close(id);
    }

    function testCapacityAndInsufficientFunds() public {
        uint256 id = create(0, 1, 2000);
        Escrow.Authorization memory a = auth(id, fan, bytes32(uint256(1)));
        bytes memory s = sig(a);
        vm.expectRevert(Escrow.InsufficientFunding.selector);
        e.claim(a, s);
        e.fund{value: 1 ether}(id);
        e.claim(a, s);
        a.beneficiary = address(0x123);
        a.sourceNullifier = bytes32(uint256(2));
        s = sig(a);
        vm.expectRevert(Escrow.InsufficientFunding.selector);
        e.claim(a, s);
        vm.expectRevert();
        e.fund{value: 1}(id);
        check(id, 0, 1);
    }

    function testUnauthorizedAndPrematureRefundAndFunding() public {
        uint256 id = create(1 ether, 2, 2000);
        vm.expectRevert(Escrow.RefundUnavailable.selector);
        e.close(id);
        vm.prank(fan);
        vm.expectRevert(Escrow.NotCreator.selector);
        e.close(id);
        vm.deal(fan, 1 ether);
        vm.prank(fan);
        vm.expectRevert(Escrow.NotCreator.selector);
        e.fund{value: 1}(id);
        vm.expectRevert();
        e.fund(id);
        vm.warp(2000);
        vm.expectRevert();
        e.fund{value: 1}(id);
    }

    function testReceiverRejectionRollsBackAndIsolates() public {
        uint256 id = create(1 ether, 1, 2000);
        uint256 other = create(1 ether, 1, 2000);
        Receiver receiver = new Receiver(e);
        receiver.configure(0, true);
        Escrow.Authorization memory a = auth(id, address(receiver), bytes32(uint256(1)));
        bytes memory s = sig(a);
        vm.expectRevert(Escrow.TransferFailed.selector);
        e.claim(a, s);
        check(id, 1 ether, 0);
        require(!e.consumed(id, a.sourceNullifier));
        a = auth(other, fan, bytes32(uint256(1)));
        e.claim(a, sig(a));
        check(other, 0, 1);
    }

    function testCrossFunctionReentrancy() public {
        Receiver receiver = new Receiver(e);
        uint256 refundId = receiver.create{value: 1 ether}(1200);
        receiver.configure(refundId, false);
        uint256 id = create(1 ether, 1, 2000);
        vm.warp(1300);
        Escrow.Authorization memory a = auth(id, address(receiver), bytes32(uint256(1)));
        e.claim(a, sig(a));
        require(receiver.attacked() && !receiver.reentered());
        check(refundId, 1 ether, 0);
        receiver.close();
        check(refundId, 0, 0);
    }

    function testRefundRejectionRollsBack() public {
        Receiver receiver = new Receiver(e);
        uint256 id = receiver.create{value: 1 ether}(1200);
        receiver.configure(id, true);
        vm.warp(1200);
        vm.expectRevert();
        receiver.close();
        check(id, 1 ether, 0);
        receiver.configure(id, false);
        receiver.close();
        check(id, 0, 0);
    }

    function testSignerRotationAndTwoStepAdmin() public {
        vm.expectRevert();
        e.renounceOwnership();
        vm.expectRevert();
        e.transferOwnership(address(0));
        uint256 id = create(1 ether, 1, 2000);
        Escrow.Authorization memory a = auth(id, fan, bytes32(uint256(1)));
        bytes memory s = sig(a);
        vm.prank(fan);
        vm.expectRevert();
        e.setEligibilitySigner(fan);
        vm.expectRevert();
        e.setEligibilitySigner(address(0));
        e.setEligibilitySigner(vm.addr(42));
        vm.expectRevert();
        e.claim(a, s);
        e.setEligibilitySigner(signer);
        vm.expectRevert();
        e.claim(a, s);
        a.signerEpoch = e.signerEpoch();
        e.claim(a, sig(a));
        e.transferOwnership(fan);
        require(e.owner() == address(this));
        vm.prank(fan);
        e.acceptOwnership();
        require(e.owner() == fan);
    }

    function testForcedSurplusAndRelayRecipient() public {
        uint256 id = create(1 ether, 1, 2000);
        vm.deal(address(e), 2 ether);
        Escrow.Authorization memory a = auth(id, fan, bytes32(uint256(1)));
        bytes memory s = sig(a);
        vm.prank(address(0x123));
        e.claim(a, s);
        require(fan.balance == 1 ether && address(e).balance == 1 ether);
        check(id, 0, 1);
    }

    function testFuzzFundingConservation(uint96 payout, uint8 slots, uint96 seed) public {
        uint256 amount = uint256(payout) + 1;
        uint256 cap = uint256(slots) + 1;
        uint256 total = amount * cap;
        vm.deal(address(this), total);
        uint256 first = uint256(seed) % (total + 1);
        uint256 id = e.createBenefit{value: first}(amount, cap, 2000, RULE, 1);
        if (total > first) e.fund{value: total - first}(id);
        check(id, total, 0);
        vm.warp(2000);
        e.close(id);
        check(id, 0, 0);
    }
}

contract AccountingHandler {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    Escrow public e;
    uint256 public id;
    uint256 public serial;

    constructor(Escrow escrow) {
        e = escrow;
        id = e.createBenefit(1 ether, 100, 1000000, keccak256("rule"), 1);
    }
    receive() external payable {}

    function fund(uint96 value) external {
        uint256 n = uint256(value) % 10 ether + 1;
        vm.deal(address(this), address(this).balance + n);
        try e.fund{value: n}(id) {} catch {}
    }

    function claim(uint8 who) external {
        Escrow.Authorization memory a = Escrow.Authorization(
            id, address(uint160(100 + who)), 1 ether, 999999, bytes32(uint256(who) + 1), keccak256("rule"), 1, 1
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xA11CE, e.authorizationDigest(a));
        try e.claim(a, abi.encodePacked(r, s, v)) {} catch {}
    }

    function advance(uint16 step) external {
        vm.warp(block.timestamp + uint256(step));
    }

    function close() external {
        try e.close(id) {} catch {}
    }

    function surplus(uint64 value) external {
        vm.deal(address(e), address(e).balance + value);
    }
}

contract AccountingInvariant {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    Escrow e;
    AccountingHandler h;

    function setUp() public {
        vm.warp(1000);
        e = new Escrow(address(this), vm.addr(0xA11CE));
        h = new AccountingHandler(e);
    }

    function targetContracts() external view returns (address[] memory a) {
        a = new address[](1);
        a[0] = address(h);
    }

    function invariantConservationAndCapacity() public view {
        (,, uint256 capacity,,,, uint256 funded, uint256 paid, uint256 refunded, uint256 remaining, uint256 claims,) =
            e.benefits(h.id());
        require(funded == paid + refunded + remaining);
        require(claims <= capacity);
        require(e.totalLiability() == remaining);
        require(remaining <= address(e).balance);
    }
}

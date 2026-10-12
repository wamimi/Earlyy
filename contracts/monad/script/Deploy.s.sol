// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;
import {EarlyBenefitEscrow} from "../src/EarlyBenefitEscrow.sol";

interface DeployVm {
    function envAddress(string calldata) external returns (address);
    function startBroadcast() external;
    function stopBroadcast() external;
}

contract Deploy {
    DeployVm constant vm = DeployVm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external returns (EarlyBenefitEscrow escrow) {
        require(block.chainid == 10143, "Monad testnet only");
        address admin = vm.envAddress("MONAD_ESCROW_ADMIN");
        address signer = vm.envAddress("EARLY_ELIGIBILITY_SIGNER_ADDRESS");
        vm.startBroadcast();
        escrow = new EarlyBenefitEscrow(admin, signer);
        vm.stopBroadcast();
    }
}

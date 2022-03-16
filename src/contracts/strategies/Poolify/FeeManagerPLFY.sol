// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "./StratManagerPLFY.sol";

abstract contract FeeManagerPLFY is StratManagerPLFY {

    /**
     * @dev Distribution of fees earned. This allocations relative to the % implemented on chargeFees().
     *
     * {CALL_FEE} - 0.5% goes to pay for harvest execution.
     * {MAX_FEE} - Aux const used to safely calc the correct amounts.
     * 
     * {WITHDRAWAL_FEE} - Fee taxed when a user withdraws funds. 5 === 0.05% fee.
     * {WITHDRAWAL_MAX} - Aux const used to safely calc the correct amounts.
     */

    uint public CALL_FEE = 5;    // 0.05%
    uint constant public CALL_FEE_MAX   = 1000; //  10.00%
    uint constant public CALL_PRECISION = 10000;

    uint public WITHDRAWAL_FEE = 0; // 0.05%
    uint constant public WITHDRAWAL_FEE_MAX   = 1000; //  10.00%
    uint constant public WITHDRAWAL_PRECISION = 10000; // 100 * 100


    function setCallFee(uint256 _fee) external onlyManager {
        require(_fee <= CALL_FEE_MAX, "!cap");
        
        CALL_FEE = _fee;
    }

    function setWithdrawalFee(uint256 _fee) external onlyManager {
        require(_fee <= WITHDRAWAL_FEE_MAX, "!cap");

        WITHDRAWAL_FEE = _fee;
    }
}
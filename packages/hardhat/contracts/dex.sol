// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "hardhat/console.sol";

/**
 * @title DEX Template
 * @author stevepham.eth and m00npapi.eth
 * @notice Empty DEX.sol that just outlines what features could be part of the challenge (up to you!)
 * @dev We want to create an automatic market where our contract will hold reserves of both ETH and 🎈 Balloons. These reserves will provide liquidity that allows anyone to swap between the assets.
 * NOTE: functions outlined here are what work with the front end of this branch/repo. Also return variable names that may need to be specified exactly may be referenced (if you are confused, see solutions folder in this repo and/or cross reference with front-end code).
 */
contract DEX {
    /* ========== GLOBAL VARIABLES ========== */
    mapping (address => uint256) public liquidity ;
    uint256 public totalLiquidity = 0;

    using SafeMath for uint256; //outlines use of SafeMath for uint256 variables
    IERC20 token; //instantiates the imported contract

    /* ========== EVENTS ========== */

    /**
     * @notice Emitted when ethToToken() swap transacted
     */
    event EthToTokenSwap(address swaper, uint256 amountEth, uint256 amountToken);

    /**
     * @notice Emitted when tokenToEth() swap transacted
     */
    event TokenToEthSwap(address swaper, uint256 amountToken, uint256 amountEth);

    /**
     * @notice Emitted when liquidity provided to DEX and mints LPTs.
     */
    event LiquidityProvided(address sender, uint256 liquidityProvided, uint256 ethAdded, uint256 tokensAdded);

    /**
     * @notice Emitted when liquidity removed from DEX and decreases LPT count within DEX.
     */
    event LiquidityRemoved(address remover, uint256 liquidityRemoved, uint256 ethRemoved, uint256 tokensRemoved);

    /* ========== CONSTRUCTOR ========== */

    constructor(address token_addr) public {
        token = IERC20(token_addr); //specifies the token address that will hook into the interface and be used through the variable 'token'
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /* Added function sqrt from Math.sol */
    function sqrt(uint y) internal pure returns (uint z) {
        if (y > 3) {
            z = y;
            uint x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }  

    /**
     * @notice initializes amount of tokens that will be transferred to the DEX itself from the erc20 contract mintee (and only them based on how Balloons.sol is written). Loads contract up with both ETH and Balloons.
     * @param amountOfTokens amount to be transferred to DEX
     * @return totalLiquidity is the number of LPTs minting as a result of deposits made to DEX contract
     * NOTE: since ratio is 1:1, this is fine to initialize the totalLiquidity (wrt to balloons) as equal to eth balance of contract.
     */
    function init(uint256 amountOfTokens) public payable returns (uint256) {
        require (token.balanceOf(msg.sender) >= amountOfTokens, "not enought tokens !");
        require (totalLiquidity == 0, "Allready been initialise");
        require (token.allowance(msg.sender, address(this)) >= amountOfTokens, "Please aprouve the amount First");
        require (token.transferFrom(msg.sender, address(this), amountOfTokens), "Token transfer fail");
        totalLiquidity = sqrt(msg.value.mul(amountOfTokens));
        liquidity[msg.sender] = totalLiquidity;
        return totalLiquidity; 
    }

    //geting reserves for price calculation
    function getReserves () public view returns (uint256 ethReserves, uint256 tokenReserves) {
        return (address(this).balance, token.balanceOf(address(this)));
    }

    /**
     * @notice returns yOutput, or yDelta for xInput (or xDelta)
     * @dev Follow along with the [original tutorial](https://medium.com/@austin_48503/%EF%B8%8F-minimum-viable-exchange-d84f30bd0c90) Price section for an understanding of the DEX's pricing model and for a price function to add to your contract. You may need to update the Solidity syntax (e.g. use + instead of .add, * instead of .mul, etc). Deploy when you are done.
     */
    function price(
        uint256 xInput,
        uint256 xReserves,
        uint256 yReserves
    ) public view returns (uint256 yOutput) {
        uint256 xInputWithFee = xInput.mul(997);
        uint256 numerator = xInputWithFee.mul(yReserves);
        uint256 denominator = (xReserves.mul(1000)).add(xInputWithFee);
        return (numerator / denominator);
    }

    /**
     * @notice returns liquidity for a user. Note this is not needed typically due to the `liquidity()` mapping variable being public and having a getter as a result. This is left though as it is used within the front end code (App.jsx).
     */
    function getLiquidity(address lp) public view returns (uint256) {
        return liquidity[lp];
    }

    /**
     * @notice sends Ether to DEX in exchange for $BAL
     */
    function ethToToken() public payable returns (uint256 tokenOutput) { 
        uint256 amountTokenOutput = price(msg.value, address(this).balance.sub(msg.value), token.balanceOf(address(this)));//was reviewed ... because address(this).balance allready contain the message value !
        console.log("amountTokenOUtput : ",amountTokenOutput );
        require (token.transfer(msg.sender, amountTokenOutput), "tokens transfer Fail ");
        emit EthToTokenSwap(msg.sender, msg.value, amountTokenOutput);
        return amountTokenOutput;
    }

    /**
     * @notice sends $BAL tokens to DEX in exchange for Ether
     */
    function tokenToEth(uint256 tokenInput) public returns (uint256 ethOutput) {
        uint256 allowance = token.allowance(msg.sender, address(this));
        require (allowance >= tokenInput, "Please aprouve the the contract");
        uint256 amoutEthOutput = price(tokenInput, token.balanceOf(address(this)), address(this).balance);
        console.log("amountTokenOUtput : ",amoutEthOutput );
        require (token.transferFrom(msg.sender, address(this), tokenInput), "Token transfer fail");
        (bool sucess, ) = payable(msg.sender).call{value : amoutEthOutput}("");
        require (sucess, "eth transfer fail");
        emit TokenToEthSwap(msg.sender, tokenInput, amoutEthOutput);
        return amoutEthOutput;
    }

    /**
     * @notice allows deposits of $BAL and $ETH to liquidity pool
     * NOTE: parameter is the msg.value sent with this function call. That amount is used to determine the amount of $BAL needed
      as well and taken from the depositor.
     * NOTE: user has to make sure to give DEX approval to spend their tokens on their behalf by calling approve function prior 
     to this function call.
     * NOTE: Equal parts of both assets will be removed from the user's wallet with respect to the price outlined by the AMM.
     */
    function deposit() public payable returns (uint256 tokensDeposited) {
        uint256 EthreservesBeforDeposit = address(this).balance.sub(msg.value);
        tokensDeposited = (msg.value.mul(token.balanceOf(address(this)))) / EthreservesBeforDeposit;
        console.log("tokensDeposited : ", tokensDeposited);
        uint256 allowance = token.allowance(msg.sender, address(this));
        require (allowance >= tokensDeposited, "Please aprouve the the contract");
        require (token.transferFrom(msg.sender, address(this), tokensDeposited), "Token Transfer Fail");      
        uint256 liquidityShared = sqrt(msg.value.mul(tokensDeposited)); // <= came from uniswap V2 Doc
        totalLiquidity = totalLiquidity.add(liquidityShared);
        liquidity[msg.sender] = liquidity[msg.sender].add(liquidityShared);
        emit LiquidityProvided(msg.sender, liquidityShared, msg.value, tokensDeposited );
        return tokensDeposited;
    }

   

    /**
     * @notice allows withdrawal of $BAL and $ETH from liquidity pool
     * NOTE: with this current code, the msg caller could end up getting very little back if the liquidity is super low in the pool. I guess they could see that with the UI.
     */
    function withdraw(uint256 amount) public returns (uint256 eth_amount, uint256 token_amount) {    
        require (liquidity[msg.sender] >= amount, "Not provided enough liquidity");
        console.log("liquidity LP before withdraw: ", liquidity[msg.sender]);
        eth_amount = amount.mul(address(this).balance) / totalLiquidity;
        token_amount = amount.mul(token.balanceOf(address(this))) / totalLiquidity;
        liquidity[msg.sender] = liquidity[msg.sender].sub(amount);
        console.log("liquidity LP after withdraw: ", liquidity[msg.sender]);
        console.log("Total liquidity  : ", totalLiquidity);
        console.log("eth : ", eth_amount);
        console.log("token : ", token_amount);
        uint256 liquidityWithdraw = sqrt(eth_amount.mul(token_amount));
        totalLiquidity = totalLiquidity.sub(liquidityWithdraw);
        (bool success, ) = payable(msg.sender).call{value: eth_amount}("");
        require (success, "Eth transfer Fail");
        require ( token.transfer(msg.sender, token_amount));
        emit LiquidityRemoved(msg.sender, liquidityWithdraw, eth_amount, token_amount);
        return (eth_amount, token_amount);       
    }
}
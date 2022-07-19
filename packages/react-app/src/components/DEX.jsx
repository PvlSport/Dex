import { Card, Col, Divider, Input, Row, Button } from "antd";
import { useBalance, useContractReader, useBlockNumber } from "eth-hooks";
import { useEventListener } from "eth-hooks/events/useEventListener";
import { useTokenBalance } from "eth-hooks/erc/erc-20/useTokenBalance";
import { ethers } from "ethers";
import React, { useState } from "react";
import Address from "./Address";
import Contract from "./Contract";
import Curve from "./Curve";
import TokenBalance from "./TokenBalance";
import Blockies from "react-blockies";
import { useEffect } from "react";

const contractName = "DEX";
const tokenName = "Realcees";

export default function Dex(props) {
  let display = [];

  const [form, setForm] = useState({});
  const [values, setValues] = useState({});
  const tx = props.tx;

  const writeContracts = props.writeContracts;

  const contractAddress = props.readContracts[contractName].address;
  const tokenAddress = props.readContracts[tokenName].address;
  const contractBalance = useBalance(props.localProvider, contractAddress);
  const tokenBalance = useTokenBalance(props.readContracts[tokenName], contractAddress, 120); //replaced props.localProvider by 120 (120 sec ??)
  const liquidity = useContractReader(props.readContracts, contractName, "totalLiquidity");

  //fixing tokanBlance "issue : "
  const [tokenBalanceFloat, setTokenbalanceFloat] = useState();
  const [ethBalanceFloat, setEthBalanceFloat] = useState();;
  useEffect ( async () => {
    if (props.readContracts && props.readContracts[tokenName] && props.localProvider){
    let newTokenBalance = await props.readContracts[tokenName].balanceOf(contractAddress);
    setTokenbalanceFloat(parseFloat(ethers.utils.formatEther(newTokenBalance.toString())));
    setEthBalanceFloat(parseFloat(ethers.utils.formatEther(contractBalance)));}
  },[contractBalance]);
 


  

  //swap front design by CM
  //allowance :
  const allowanceCM = async () => {
    let _allowance = await props.readContracts[tokenName].allowance(
    props.address,
    props.readContracts[contractName].address,
  );
  console.log("allowance CM :",_allowance);
  return (_allowance)
  }

  const [swap, toggleSwap] = useState(0);
  const path = ["ETH", "RLCS"];
  const icon = ["Ξ", "🤘"]
  const [visibility, setVisibility] = useState(true); 
  const [lpVisibility, setLpVisibility] = useState(true)
  const [loading, setLoading] = useState(false);
  const [lpValues, setLpValues] = useState();
  const [lpTokenValues, setLpTokenValues] = useState();
  const [withdrawLpValues, setWithdrawLpValues] = useState();
  const [lpLoading, setLpLoading] = useState();

  const getPrice = async (title, value) => {
    if (value === '') return '';
    let reserves = await props.readContracts[contractName].getReserves();
    let valueBN = ethers.utils.parseEther("" + value);
    console.log(reserves)
    let xReserves = title == "ETH" ? reserves[0] : reserves[1]
    let yReserves = title == "RLCS" ? reserves[0] : reserves[1]
    let price = await props.readContracts[contractName].price(valueBN, xReserves, yReserves);
    return (ethers.utils.formatEther(price))
  }
  async function checkLpButtonVisibility (_value) {
    let allowance = await allowanceCM();
    if ( _value <= ethers.utils.formatEther(allowance)) {
      setLpVisibility(true)
    } else {setLpVisibility(false)}
  }

  async function checkButtonVisibility (_value) {
    let allowance = await allowanceCM();
    let value = 0;
    if (_value) { value = _value} else {value = values["RLCS"]}
    console.log("value : ", value)
    console.log("swap :",swap)
    if(swap == 0) {setVisibility(true)
    } else if ( value <= ethers.utils.formatEther(allowance))
       {console.log("allowance decimal :",ethers.utils.formatEther(allowance))
        setVisibility(true)
    } else   setVisibility(false)
    console.log("visibility : ",visibility)
  }

  const rowSwapForm = (title, icon, disable) => {
    return (
      <Row>
        <Col span={8} style={{ textAlign: "right", opacity: 0.333, paddingRight: 6, fontSize: 24 }}>
          {title}
        </Col>
        <Col span={16}>
          <div style={{ cursor: "pointer", margin: 2 }}>
            <Input
              disabled={disable}
              addonAfter={icon}
              onChange={async e => {
                let newValues = { ...values };
                console.log("newValues", newValues)
                newValues[title] = e.target.value;
                newValues[path[swap ? 0 : 1 ]] = await getPrice(title, e.target.value);
                console.log("etargeted : ",e.target.value)
                setValues(newValues);
                console.log("values", values)
                await checkButtonVisibility (e.target.value)
              }}
              value={values[title]}
            />
          </div>
        </Col>
      </Row>
    );
  };
  let displaySwap = [];
  if (props.readContracts && props.readContracts[contractName]) {
    displaySwap.push(
      <div>
        {rowSwapForm(path[swap],icon[swap], false)}
        <Button
          onClick={() => {
            toggleSwap(swap ? 0 : 1) ;
            setValues({});
        }}>🔃</Button>
        {rowSwapForm(path[swap ? 0 : 1 ],icon[swap ? 0 : 1], true)}
        <div style={{marginTop: "16px", display:"flex", justifyContent:"space-evenly"}}>
        <Button
              type={"primary"}
              margin = {"8px"}
              disabled = {visibility}
              loading ={loading}
              onClick={ async () => {
              setLoading(true)
              let valueInEther = ethers.utils.parseEther("" + values["RLCS"] * 1.05 );
              let approveTx = await tx(writeContracts[tokenName].approve(props.readContracts[contractName].address, valueInEther, {
                gasLimit: 200000,}),);
                setLoading(false)
                checkButtonVisibility();
                  }}
                >
              Approve
            </Button>
         <Button
              type={"primary"}
              disabled = {!visibility}
              loading ={loading}
              onClick={ async () => {
                setLoading(true)
                if (swap == 0 ) {
                let valueInEther = ethers.utils.parseEther("" + values["ETH"]);
                let swapTx = await tx(writeContracts[contractName]["ethToToken"]({ value: valueInEther }));
                } else {
                  let valueInEther = ethers.utils.parseEther("" + values["RLCS"]);
                  let swapTx = await tx(writeContracts[contractName]["tokenToEth"](valueInEther));
                }
                setLoading(false)
                setValues({});
                checkButtonVisibility();
              }}
            >
              Swap
          </Button>
          </div>
        <Divider> Liquidity ({liquidity ? parseFloat(ethers.utils.formatEther(liquidity)).toFixed(4) : "none"}):</Divider>
        <Row>
        <Col span={8} style={{ textAlign: "right", opacity: 0.333, paddingRight: 6, fontSize: 24 }}>
          Add Liquidity
        </Col>
        <Col span={8}>
          <div style={{ cursor: "pointer", margin: 2 }}>
            <Input
              addonAfter="ETH"
              onChange={async e => {
                let newLpValues = { ...lpValues };
                console.log("newLpValues", newLpValues)
                newLpValues = e.target.value;
                let newLpTokenValues = e.target.value * tokenBalance / contractBalance;
                setLpValues(newLpValues);
                setLpTokenValues(newLpTokenValues);
                await checkLpButtonVisibility (newLpTokenValues)
              }}
              value={lpValues}
            />
          </div>
        </Col>
        <Col span={8}>
          <div style={{ cursor: "pointer", margin: 2 }}>
            <Input
              addonAfter="RLCS"
              onChange={async e => {
                let newLpTokenValues = { ...lpTokenValues };
                console.log("newLpTokenValues", newLpTokenValues)
                newLpTokenValues = e.target.value;
                let newLpValues = e.target.value * contractBalance / tokenBalance;
                setLpTokenValues(newLpTokenValues);
                setLpValues(newLpValues);
                await checkLpButtonVisibility (newLpTokenValues)
              }}
              value={lpTokenValues}
            />
          </div>
        </Col>
      </Row>
        <div style={{marginTop: "16px", display:"flex", justifyContent:"space-evenly"}}>
        <Button
              type={"primary"}
              margin = {"8px"}
              disabled = {lpVisibility}
              loading ={lpLoading}
              onClick={ async () => {
              setLpLoading(true)
              let valueInToken= ethers.utils.parseEther("" + lpTokenValues * 1.05 ) ; // calculated value... 
              console.log("valueInToken : ",valueInToken)
              let approveTx = await tx(writeContracts[tokenName].approve(props.readContracts[contractName].address, valueInToken, {
                gasLimit: 200000,}),);
              setLpLoading(false)
              checkLpButtonVisibility(lpTokenValues);
                  }}
                >
              Approve
            </Button>
        <Button
          type={"primary"}
          disabled = {!lpVisibility}
          loading ={lpLoading}
          onClick={async () => {
            setLpLoading(true);
            let valueInEther = ethers.utils.parseEther("" + lpValues);
            await tx(writeContracts[contractName]["deposit"]({ value: valueInEther, gasLimit: 200000 }));
            setLpValues('');
            setLpTokenValues('');
            setLpLoading(false);
            }}>
             Deposit
        </Button>
        </div>
        
        <Row style={{marginTop: "16px"}}>
        <Col span={8} style={{ textAlign: "right", opacity: 0.333, paddingRight: 6, fontSize: 24 }}>
          Remove Liquidity
        </Col>
        
        <Col span={16}>
        <Input
              addonAfter="Lp"
              onChange={async e => {
                let newWithdrawLpTokenValues = { ...withdrawLpValues };
                console.log("newWithDrawLpTokenValues", newWithdrawLpTokenValues)
                newWithdrawLpTokenValues = e.target.value;
                setWithdrawLpValues(newWithdrawLpTokenValues);
              }}
              value={withdrawLpValues}
            />
        </Col>
        </Row>
        <Button 
          style={{marginTop: "16px"}}
          type={"primary"}
          loading ={lpLoading}
          onClick={async () => {
            setLpLoading(true);
            let valueInEther = ethers.utils.parseEther("" + withdrawLpValues);
            let withdrawTxResult = await tx(writeContracts[contractName]["withdraw"](valueInEther));
            console.log("withdrawTxResult:", withdrawTxResult);
            setWithdrawLpValues('');
            setLpLoading(false);
            }}>
             Withdraw
        </Button>
      
      </div>,
    );
  }
  //end

  return (
      <div style={{display:"flex", flexWrap:"wrap", alignItems:"center", justifyContent:"center"}}>
             <div>
        <Card
              title={
                <div>
                  <span style={{ verticalAlign:"middle", fontSize:"24px", padding:"8px" }}>
                  {parseFloat(ethers.utils.formatEther(contractBalance)).toFixed(4)} ⚖️
                  </span>
                  <Address value={contractAddress} />
                  <TokenBalance name={tokenName} img={"🤘"} address={contractAddress} contracts={props.readContracts} />
                </div>
              }
              size="small"
              loading={false}
            >
             {displaySwap}
           <Button 
           />
          </Card>
      </div>
       
        <div style={{ padding: 20 }}>
          <Curve
            addingEth={swap == 0 ? values["ETH"] : 0}
            addingToken={swap == 1 ? values["RLCS"] : 0}
            ethReserve={ethBalanceFloat}
            tokenReserve={tokenBalanceFloat}
            width={500}
            height={500}
          />
        </div>
      </div>
  );
}
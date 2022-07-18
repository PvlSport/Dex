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

  const tokenBalance = useTokenBalance(props.readContracts[tokenName], contractAddress, props.localProvider);
  const tokenBalanceFloat = parseFloat(ethers.utils.formatEther(tokenBalance));
  const ethBalanceFloat = parseFloat(ethers.utils.formatEther(contractBalance));
  const liquidity = useContractReader(props.readContracts, contractName, "totalLiquidity");


 


  

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
  const [visibility, setVisibility] = useState(true); 
  const [loading, setLoading] = useState(false);
  const [lpValues, setLpValues] = useState();
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

  const rowSwapForm = (title) => {
    return (
      <Row>
        <Col span={8} style={{ textAlign: "right", opacity: 0.333, paddingRight: 6, fontSize: 24 }}>
          {title}
        </Col>
        <Col span={16}>
          <div style={{ cursor: "pointer", margin: 2 }}>
            <Input
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
        {rowSwapForm(path[swap])}
        <Button
          onClick={() => {
            toggleSwap(swap ? 0 : 1) ;
            setValues({});
        }}>🔃</Button>
        {rowSwapForm(path[swap ? 0 : 1 ])}
        <div style={{marginTop: "16px", display:"flex", justifyContent:"space-evenly"}}>
        <Button
              type={"primary"}
              margin = {"8px"}
              disabled = {visibility}
              loading ={loading}
              onClick={ async () => {
              setLoading(true)
              let valueInEther = ethers.utils.parseEther("" + values["RLCS"]);
              let approveTx = await tx(writeContracts[tokenName].approve(props.readContracts[contractName].address, valueInEther, {
                gasLimit: 200000,}),);
                if (approveTx) {
                      console.log("waiting on approve to finish...");
                      let approveTxResult = await approveTx;
                      console.log("approveTxResult:", approveTxResult);
                    }
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
                checkButtonVisibility();
              }}
            >
              Swap
          </Button>
          </div>
        <Divider> Liquidity ({liquidity ? ethers.utils.formatEther(liquidity) : "none"}):</Divider>
        <Row>
        <Col span={8} style={{ textAlign: "right", opacity: 0.333, paddingRight: 6, fontSize: 24 }}>
          Liquidity
        </Col>
        <Col span={16}>
          <div style={{ cursor: "pointer", margin: 2 }}>
            <Input
              onChange={async e => {
                let newLpValues = { ...lpValues };
                console.log("newLpValues", newLpValues)
                newLpValues = e.target.value;
                setLpValues(newLpValues);
                await checkButtonVisibility (e.target.value)
              }}
              value={lpValues}
            />
          </div>
        </Col>
      </Row>
        {/* {rowSwapForm("deposit", "📥", async value => {
          let valueInEther = ethers.utils.parseEther("" + value);
          let valuePlusExtra = ethers.utils.parseEther("" + value * 1.03);
          console.log("valuePlusExtra", valuePlusExtra);
          let allowance = await props.readContracts[tokenName].allowance(
            props.address,
            props.readContracts[contractName].address,
          );
          console.log("allowance", allowance);
          if (allowance.lt(valuePlusExtra)) {
            await tx(
              writeContracts[tokenName].approve(props.readContracts[contractName].address, valuePlusExtra, {
                gasLimit: 200000,
              }),
            );
          }
          await tx(writeContracts[contractName]["deposit"]({ value: valueInEther, gasLimit: 200000 }));
        })}

        {rowSwapForm("withdraw", "📤", async value => {
          
        })} */}
        <div style={{marginTop: "16px", display:"flex", justifyContent:"space-evenly"}}>
        <Button
          type={"primary"}
          onClick={() => {
              // tx(
              //   writeContracts.YourToken.transfer(tokenSendToAddress, ethers.utils.parseEther("" + tokenSendAmount)),
              // );
            }}>
             Deposit
        </Button>
        <Button
          type={"primary"}
          onClick={async (value) => {
            let valueInEther = ethers.utils.parseEther("" + value);
            let withdrawTxResult = await tx(writeContracts[contractName]["withdraw"](valueInEther));
            console.log("withdrawTxResult:", withdrawTxResult);
            }}>
             Withdraw
        </Button>
        </div>
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
      /* <Col span={8}>
      <Contract
            name="Realcees"
            signer={props.signer}
            provider={props.localProvider}
            show={["balanceOf", "approve"]}
            address={props.address}
            blockExplorer={props.blockExplorer}
            contractConfig={props.contractConfig}
          />
          </Col> */
  );
}
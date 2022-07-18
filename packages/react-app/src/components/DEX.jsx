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
  const reserves = useContractReader(props.readContracts, contractName, "getReserves");

  

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
  const getPrice = async (title, value) => {
    if (value === '') return '';
    let valueBN = ethers.utils.parseEther("" + value);
    console.log(reserves)
    let xReserves = title == "ETH" ? reserves[0] : reserves[1]
    let yReserves = title == "RLCS" ? reserves[1] : reserves[0]
    let price = await props.readContracts[contractName].price(valueBN, xReserves, yReserves);

    return (ethers.utils.formatEther(price))
  }

  const rowSwapForm = (title, onClick) => {
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
              }}
              value={values[title]}
              //addonAfter={
                // <div
                //   type="default"
                //   onClick={() => {
                //     onClick(values[title]);
                //     let newValues = { ...values };
                //     newValues[title] = "";
                //     setValues(newValues);
                //   }}
                // > test
            
                // </div>
              // }
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
        {rowSwapForm(path[swap], async value => {
          let valueInEther = ethers.utils.parseEther("" + value);
          let swapEthToTokenResult = await tx(writeContracts[contractName]["ethToToken"]({ value: valueInEther }));
          console.log("swapEthToTokenResult:", swapEthToTokenResult);
        })}
        <Button
        onClick={() => {
          toggleSwap(swap ? 0 : 1) ;
          console.log("swap : ", swap)
          console.log("path :", path[swap])
          console.log("value in tioggle", values)
        }}
        >🔃</Button>
        {rowSwapForm(path[swap ? 0 : 1 ], "🔏", async value => {
          let valueInEther = ethers.utils.parseEther("" + value);
          console.log("valueInEther", valueInEther);
          let allowance = allowanceCM();
          console.log("allowance", allowance);

          let approveTx;
          if (allowance.lt(valueInEther)) {
            approveTx = await tx(
              writeContracts[tokenName].approve(props.readContracts[contractName].address, valueInEther, {
                gasLimit: 200000,
              }),
            );
          }

          let swapTx = tx(writeContracts[contractName]["tokenToEth"](valueInEther, { gasLimit: 200000 }));
          if (approveTx) {
            console.log("waiting on approve to finish...");
            let approveTxResult = await approveTx;
            console.log("approveTxResult:", approveTxResult);
          }
          let swapTxResult = await swapTx;
          console.log("swapTxResult:", swapTxResult);
        })}
        <div style={{marginTop: "16px", display:"flex", justifyContent:"space-evenly"}}>

        <Button
              type={"primary"}
              margin = {"8px"}
              disabled = {visibility}
              onClick={() => {
                // tx(
                //   writeContracts.YourToken.transfer(tokenSendToAddress, ethers.utils.parseEther("" + tokenSendAmount)),
                // );
              }}
            >
              Approve
            </Button>
         <Button
              type={"primary"}
              onClick={() => {
                // tx(
                //   writeContracts.YourToken.transfer(tokenSendToAddress, ethers.utils.parseEther("" + tokenSendAmount)),
                // );
              }}
            >
              Swap
          </Button>
          </div>
          <div>Allowance : {allowanceCM}</div>
        <Divider> Liquidity ({liquidity ? ethers.utils.formatEther(liquidity) : "none"}):</Divider>

        {rowSwapForm("deposit", "📥", async value => {
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
          
        })}
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
            addingEth={values && values["ETH"] ? values["ETH"] : 0}
            addingToken={values && values["RLCS"] ? values["RLCS"] : 0}
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
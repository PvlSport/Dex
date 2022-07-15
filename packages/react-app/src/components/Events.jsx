import { List } from "antd";
import { useEventListener } from "eth-hooks/events/useEventListener";
import { Address, TokenBalance } from "../components";

/*
  ~ What it does? ~

  Displays a lists of events

  ~ How can I use? ~

  <Events
    contracts={readContracts}
    contractName="YourContract"
    eventName="SetPurpose"
    localProvider={localProvider}
    mainnetProvider={mainnetProvider}
    startBlock={1}
  />
*/

export default function Events({ contracts, contractName, eventName, localProvider, mainnetProvider, startBlock }) {
  // 📟 Listen for broadcast events
  const events = useEventListener(contracts, contractName, eventName, localProvider, startBlock);
  console.log("events : ",events );

  return (
    <div style={{ width: 600, margin: "auto", marginTop: 32, paddingBottom: 32 }}>
      <h2> {eventName} Events:</h2>
      <List
        bordered
        dataSource={events}
        renderItem={item => {
          if (eventName.includes("Swap")) {
              return (
                <List.Item key={item.blockNumber + "_" + item.args[0].toString()}>
                  <Address address={item.args[0]} ensProvider={mainnetProvider} fontSize={16} />
                  Swap
                  {eventName.indexOf("E") == 0 ? (
                  <span>
                    <TokenBalance balance={item.args[1]} provider={localProvider} /> Eth 
                    <TokenBalance balance={item.args[2]} provider={localProvider} /> Rlcs 
                    </span>
                    
                  ) : (
                    <span>
                    <TokenBalance balance={item.args[1]} provider={localProvider} /> Rlcs 
                    <TokenBalance balance={item.args[2]} provider={localProvider} /> Eth 
                    </span>
                  )}
                </List.Item>
              );} 
              else {
                return (
                  <List.Item key={item.blockNumber + "_" + item.args[0].toString()}>
                    <Address address={item.args[0]} ensProvider={mainnetProvider} fontSize={16} />
                    {eventName.includes("Provided") ? ( <span>Provided</span> ) : ( <span>Removed</span> )}
                      <span>
                      <TokenBalance balance={item.args[1]} provider={localProvider} /> liquidity 
                      <TokenBalance balance={item.args[2]} provider={localProvider} /> Eth 
                      <TokenBalance balance={item.args[3]} provider={localProvider} /> Rlcs 
                      </span>

                  </List.Item>
                );}   
        }}
      />
    </div>
  );
}

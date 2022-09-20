import "@nomiclabs/hardhat-ethers";
import fs from "fs";
import csv from "csvtojson";
const {randomBytes} = await import("crypto");

const fixedPointMult = ethers.BigNumber.from("2").pow(236);

async function main() {
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const PolkaPetsNFTMock = await ethers.getContractFactory("PolkaPetsNFTMock");
    let polkaPetsNFTMock = await PolkaPetsNFTMock.deploy();
    await polkaPetsNFTMock.deployed();
    const LootBoxNFTMock = await ethers.getContractFactory("LootBoxNFTMock");
    let lootBoxNFTMock = await LootBoxNFTMock.deploy();
    await lootBoxNFTMock.deployed();
    const PolkaPetBooster = await ethers.getContractFactory("PolkaPetBoosterMock");
    let polkaPetBooster = await PolkaPetBooster.deploy(lootBoxNFTMock.address,polkaPetsNFTMock.address);
    await polkaPetBooster.deployed();
    let signer = (await ethers.getSigners())[0].address;
    console.log(signer);
    console.log(process.cwd());

    let packContents = await csv().fromFile("./PackContents.csv");
    let slotCount = [0,0,0,0];
    for(let nft of packContents){
        slotCount[nft["Slot"]] += parseInt(nft["Quantity"]);
    }
    console.log(slotCount);

    let mintIDs = [];
    let mintAmounts = [];
    for(let nft of packContents){
        mintIDs.push(parseInt(nft["CardID"]));
        mintAmounts.push(parseInt(nft["Quantity"]));
    }

    await polkaPetsNFTMock.mintBatch(signer, mintIDs, mintAmounts, "0x");
    await polkaPetsNFTMock.safeBatchTransferFrom(signer, polkaPetBooster.address, mintIDs, mintAmounts, "0x");

    let slotsIds = [[],[],[]];
    let slotsQuantities = [[],[],[]];
    let slotsProbs = [[],[],[]];
    for(let nft of packContents){
        let slot = parseInt(nft["Slot"]) - 1;
        let quantity = parseInt(nft["Quantity"]);
        let prob = ethers.BigNumber.from(quantity).mul(fixedPointMult).div(slotCount[slot+1]);
        //console.log(prob.toHexString());
        slotsIds[slot].push(parseInt(nft["CardID"]));
        slotsQuantities[slot].push(quantity);
        slotsProbs[slot].push(prob);
    }

    await polkaPetBooster.pause();

    //await polkaPetBooster.estimateGas.batchAddCards(slotsIds,slotsQuantities,slotsProbs,6000);
    let batchAddCards = await polkaPetBooster.batchAddCards(slotsIds,slotsQuantities,slotsProbs,6000);
    let batchAddCardsReceipt = await ethers.provider.getTransactionReceipt(batchAddCards.hash);
    console.log(batchAddCardsReceipt.gasUsed.toString());

    //console.log(await ethers.provider.getTransactionReceipt(batchAddCards.hash));

    await polkaPetBooster.unpause();

    await lootBoxNFTMock.mint(signer, 1, 6000);

    await lootBoxNFTMock.setApprovalForAll(polkaPetBooster.address, true);

    let openPack1 = await polkaPetBooster.openPack(1,1);

    let requestId = polkaPetBooster.interface.parseLog((await ethers.provider.getTransactionReceipt(openPack1.hash)).logs[1]).args.requestId;

    let random256 = "0x" + randomBytes(32).toString("hex");
    console.log(random256);


    let openPack2 = await polkaPetBooster.fulfillRandomness_(requestId,random256);

    console.log((await ethers.provider.getTransactionReceipt(openPack2.hash)).gasUsed.toString());


}

main()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error);
    process.exit(1);
});
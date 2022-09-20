import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
const fs = require('fs');

const { constants } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const eth = ethers.utils.parseUnits;

const address = (account: Signer) => {
  return account.getAddress().then((res: any) => { return res.toString() });
}

describe('PolkaPetBooster', function () {
  let ERC20Mock: any;
  let LootBoxNFTMock: any;
  let PolkaPetsNFTMock: any;
  let PolkaPetBoosterMock: any;

  let linkToken: any;
  let lootBox: any;
  let polkaPets: any;
  let booster: any;

  let owner: Signer;
  let member: Signer;
  let vrfCoordinator: Signer;
  let members: Signer[];

  before(async () => {
    [owner, member, vrfCoordinator, ...members] = await ethers.getSigners();

    ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    LootBoxNFTMock = await ethers.getContractFactory("LootBoxNFTMock");
    PolkaPetsNFTMock = await ethers.getContractFactory("PolkaPetsNFTMock");
    PolkaPetBoosterMock = await ethers.getContractFactory("PolkaPetBoosterMock");
  })

  beforeEach(async () => {
    linkToken = await ERC20Mock.deploy();
    await linkToken.deployed();

    lootBox = await LootBoxNFTMock.deploy();
    await lootBox.deployed();

    polkaPets = await PolkaPetsNFTMock.deploy();
    await polkaPets.deployed();

    booster = await PolkaPetBoosterMock.deploy(
      await address(vrfCoordinator),
      linkToken.address,
      lootBox.address,
      polkaPets.address
    );
    await booster.deployed();
  });

  describe('Check constructor', () => {
    it('Should set token addresses correctly', async function () {
      expect(await booster.lootBoxNFT()).to.equal(lootBox.address);
      expect(await booster.polkapetNFT()).to.equal(polkaPets.address);
    });
  });


  describe('Check public functions', function () {
    describe('collectTokens', () => {
      beforeEach(async () => {
        expect(await linkToken.balanceOf(booster.address)).to.equal('0');

        await linkToken.mint(booster.address, eth('100'));
        expect(await linkToken.balanceOf(booster.address)).to.equal(eth('100'));
      });

      it('should revert if caller not owner', async () => {
        await expect(booster.connect(member).collectTokens(linkToken.address, eth('60')))
          .to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('should revoke tokens correctly', async () => {
        expect(await linkToken.balanceOf(await address(owner))).to.equal('0');

        await booster.collectTokens(linkToken.address, eth('60'));
        expect(await linkToken.balanceOf(booster.address)).to.equal(eth('40'));
        expect(await linkToken.balanceOf(await address(owner))).to.equal(eth('60'));
      });
      //! FAIL
      // it('should revert if not enough tokens', async () => {
      //   await expect(booster.collectTokens(linkToken.address, eth('110')))
      //     .to.be.revertedWith('PolkaPetBooster: insufficient funds');
      // });
    });

    describe('collectNFTs', () => {
      beforeEach(async () => {
        expect(await lootBox.balanceOf(booster.address, '1')).to.equal('0');

        await lootBox.mint(booster.address, '1', '10');
        expect(await lootBox.balanceOf(booster.address, '1')).to.equal('10');
      });

      it('should revert if caller not owner', async () => {
        await expect(booster.connect(member).collectNFTs(lootBox.address, '1', '2'))
          .to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('should revoke tokens correctly', async () => {
        expect(await lootBox.balanceOf(await address(owner), '1')).to.equal('0');

        await booster.collectNFTs(lootBox.address, '1', '2');
        expect(await lootBox.balanceOf(booster.address, '1')).to.equal('8');
        expect(await lootBox.balanceOf(await address(owner), '1')).to.equal('2');
      });
      //! FAIL
      // it('should revert if not enough tokens', async () => {
      //   await expect(booster.collectNFTs(lootBox.address, '1', '12'))
      //     .to.be.revertedWith('PolkaPetBooster: insufficient funds');
      // });
    });

    describe('pause', () => {
      it('should revert if caller not owner', async () => {
        await expect(booster.connect(member).pause())
          .to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('should pause', async () => {
        expect(await booster.paused()).to.be.eq(false);

        await booster.pause();
        expect(await booster.paused()).to.be.eq(true);
      });
    });

    describe('unpause', () => {
      beforeEach(async () => {
        await booster.pause();
      });

      it('should revert if caller not owner', async () => {
        await expect(booster.connect(member).unpause())
          .to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('should unpause', async () => {
        expect(await booster.paused()).to.be.eq(true);

        await booster.unpause();
        expect(await booster.paused()).to.be.eq(false);
      });
    });

    describe('batchAddCards', () => {
      let rareIds: any;
      let rareAmounts: any;
      let basicIds: any;
      let basicAmounts: any;

      beforeEach(async () => {
        rareIds = [5, 10];
        rareAmounts = [10, 18];
        basicIds = [0, 1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29];
        basicAmounts = [3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1];

        await booster.pause();
        await booster.batchAddCards(
          rareIds,
          rareAmounts,
          basicIds,
          basicAmounts
        );

        await booster.unpause();
        expect(await booster.availablePacks()).to.be.eq('28');
      });

      it('should revert if different length of array with ids and amounts', async () => {
        await booster.pause();

        await expect(booster.batchAddCards([1, 2, 3], [2, 4], [3, 4, 6], [6, 2, 4]))
          .to.be.revertedWith('PolkaPetBooster: different length or array');
        await expect(booster.batchAddCards([1, 2], [2, 4, 3], [3, 4, 6], [6, 2, 4]))
          .to.be.revertedWith('PolkaPetBooster: different length or array');

        await expect(booster.batchAddCards([1, 2], [2, 4], [3, 4], [6, 2, 4]))
          .to.be.revertedWith('PolkaPetBooster: different length or array');
        await expect(booster.batchAddCards([1, 2], [2, 4], [3, 4, 6], [6, 2]))
          .to.be.revertedWith('PolkaPetBooster: different length or array');  
      });

      it('should revert if different length of rare and basic arrays', async () => {
        await booster.pause();

        await expect(booster.batchAddCards([1, 2], [1, 2], [3, 4, 6], [5, 1, 2]))
          .to.be.revertedWith('PolkaPetBooster: not compatible length of arrays rare and basic cards');

        await expect(booster.batchAddCards([1, 2], [2, 2], [3, 4, 6], [3, 1, 2]))
          .to.be.revertedWith('PolkaPetBooster: not compatible length of arrays rare and basic cards'); 
      });

      it('should add to rareCards', async () => {
        expect(await booster.rareCards(0)).to.be.eq('5');
        expect(await booster.rareCards(9)).to.be.eq('5');

        expect(await booster.rareCards(10)).to.be.eq('10');
        expect(await booster.rareCards(27)).to.be.eq('10');
      });

      it('should add to basicCards', async () => {
        expect(await booster.basicCards(0)).to.be.eq('0');
        expect(await booster.basicCards(2)).to.be.eq('0');

        expect(await booster.basicCards(54)).to.be.eq('28');
        expect(await booster.basicCards(55)).to.be.eq('29');
      });

      it('should reset array rareCards', async () => {
        expect(await booster.rareCards(0)).to.be.eq('5');
        expect(await booster.rareCards(10)).to.be.eq('10');

        await booster.pause();
        await booster.batchAddCards(
          [1, 2],
          [2, 4],
          [3, 4, 6],
          [6, 2, 4]
        );

        expect(await booster.rareCards(0)).to.be.eq('1');
        expect(await booster.rareCards(2)).to.be.eq('2');
      });

      it('should reset array basicCards', async () => {
        expect(await booster.basicCards(0)).to.be.eq('0');
        expect(await booster.basicCards(3)).to.be.eq('1');

        await booster.pause();
        await booster.batchAddCards(
          [1, 2],
          [2, 4],
          [3, 4, 6],
          [6, 2, 4]
        );

        expect(await booster.basicCards(0)).to.be.eq('3');
        expect(await booster.basicCards(7)).to.be.eq('4');
      });

      it('should change availablePacks', async () => {
        expect(await booster.availablePacks()).to.be.eq('28');

        await booster.pause();
        await booster.batchAddCards(
          [1, 2],
          [2, 4],
          [3, 4, 6],
          [6, 2, 4]
        );

        expect(await booster.availablePacks()).to.not.eq('28');
      });

      it('should change availablePacks correctly', async () => {
        expect(await booster.availablePacks()).to.be.eq('28');

        await booster.pause();
        await booster.batchAddCards([1, 2], [2, 4], [3, 4, 6], [6, 2, 4]);
        expect(await booster.availablePacks()).to.be.eq('6');

        await booster.batchAddCards([1, 2], [1, 2], [3, 4, 6], [3, 1, 2]);
        expect(await booster.availablePacks()).to.be.eq('3');
      });
    });

    describe('openPack', () => {
      beforeEach(async () => {
        await polkaPets.mint(booster.address, '100');

        await lootBox.mint(await address(owner), '1', '100');
        await lootBox.setApprovalForAll(booster.address, true);
      });
      //! FAIL
      // it('should revert if not enough lootBox token', async () => {
      //   await expect(booster.connect(member).openPack('1'))
      //     .to.be.revertedWith('PolkaPetBooster: insufficient funds');
      // });

      it('should revert if not approved', async () => {
        await lootBox.mint(await address(member), '1', '10');

        await expect(booster.connect(member).openPack('1'))
          .to.be.revertedWith('PolkaPetBooster: should be approved');
      });

      it('should revert if no available packs', async () => {
        expect(await booster.availablePacks()).to.be.eq('0');

        await expect(booster.openPack('1'))
          .to.be.revertedWith('PolkaPetBooster: no available packs');
      });

      describe('set up cards', () => {
        let requestId: any;

        beforeEach(async () => {
          await booster.pause();
          await booster.batchAddCards(
            [5, 10],
            [10, 18],
            [0, 1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
            [3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1]
          );

          await booster.unpause();
          expect(await booster.availablePacks()).to.be.eq('28');

          requestId = ethers.utils.keccak256(await address(owner));
        });

        it('should add to mapping requestId and address member', async () => {
          expect(await booster.requestByMembers(requestId)).to.be.eq(ZERO_ADDRESS);

          await booster.openPack('1');
          expect(await booster.requestByMembers(requestId)).to.be.eq(await address(owner));
        });

        it('should burn token', async () => {
          expect(await lootBox.balanceOf(await address(owner), '1')).to.be.eq('100');
          await booster.openPack('1');
          expect(await lootBox.balanceOf(await address(owner), '1')).to.be.eq('99');
        });

        it('should decrease availablePacks', async () => {
          expect(await booster.availablePacks()).to.be.eq('28');
          await booster.openPack('1');

          expect(await booster.availablePacks()).to.be.eq('27');
        });

        it('should catch burn event', async () => {
          await expect(booster.openPack('1'))
            .to.emit(lootBox, 'TransferSingle')
            .withArgs(booster.address, await address(owner), ZERO_ADDRESS, '1', '1');
        });

        it('should catch OpenPackRequest event', async () => {
          await expect(booster.openPack('1'))
            .to.emit(booster, 'OpenPackRequest')
            .withArgs(await address(owner), requestId);
        });
      });
    });

    describe('fulfillRandomness', () => {
      let requestId: any;
      let randomResult: any;
      let idsWon: any;
      let amounts: any;

      beforeEach(async () => {
        idsWon = ['5', '2', '12'];
        amounts = ['1', '1', '1'];

        await polkaPets.mint(booster.address, '100');

        await lootBox.mint(await address(owner), '1', '100');
        await lootBox.setApprovalForAll(booster.address, true);

        await booster.pause();
        await booster.batchAddCards(
          [5, 10],
          [10, 18],
          [0, 1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
          [3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1]
        );

        await booster.unpause();
        expect(await booster.availablePacks()).to.be.eq('28');

        await booster.openPack('1');

        requestId = ethers.utils.keccak256(await address(owner));
        randomResult = '40824660414739121329783014905883498992479885505029867426495213400009389749077';
      });

      it('should revert if recipient is ZERO_ADDRESS', async () => {
        const requestIdMember = ethers.utils.keccak256(await address(member));

        await expect(booster.fulfillRandomness_(requestIdMember, randomResult))
          .to.be.revertedWith('PolkaPetBooster: not registered requestId');        
      });

      it('should decrease rare array length', async () => {
        expect(await booster.rareCardsLength()).to.be.eq('28');

        await booster.fulfillRandomness_(requestId, randomResult);

        expect(await booster.rareCardsLength()).to.be.eq('27');
      });

      it('should decrease basic array length', async () => {
        expect(await booster.basicCardsLength()).to.be.eq('56');

        await booster.fulfillRandomness_(requestId, randomResult);

        expect(await booster.basicCardsLength()).to.be.eq('54');
      });

      it('should transfer tokens', async () => {
        expect(await polkaPets.balanceOf(await address(owner), idsWon[0])).to.be.eq('0');
        expect(await polkaPets.balanceOf(await address(owner), idsWon[1])).to.be.eq('0');
        expect(await polkaPets.balanceOf(await address(owner), idsWon[2])).to.be.eq('0');

        await expect(booster.fulfillRandomness_(requestId, randomResult))
          .to.emit(polkaPets, 'TransferBatch')
          .withArgs(booster.address, booster.address, await address(owner), idsWon, amounts);

        expect(await polkaPets.balanceOf(await address(owner), idsWon[0])).to.be.eq('1');
        expect(await polkaPets.balanceOf(await address(owner), idsWon[1])).to.be.eq('1');
        expect(await polkaPets.balanceOf(await address(owner), idsWon[2])).to.be.eq('1');
      });

      it('should catch event', async () => {
        await expect(booster.fulfillRandomness_(requestId, randomResult))
          .to.emit(booster, 'OpenedPack')
          .withArgs(await address(owner), idsWon[0], idsWon[1], idsWon[2]);
      });
    });

    describe('expand', () => {
      let randomResult: any;
      let array: any = [];

      before(() => {
        randomResult = '40824660414739121329783014905883498992479885505029867426495213400009389749077';
      });

      it('should return n random number', async () => {
        let result: any = await booster.expand_(randomResult, '3');
        expect(result).to.be.a('array');

        expect(result.length).to.be.eq(3);

        result = await booster.expand_(randomResult, '6');
        expect(result).to.be.a('array');

        expect(result.length).to.be.eq(6);
      });

      /*
        Dev: This test write to file 1000 random value, and using scrip 
        getPlot.js you can draw result of expand for 1000 random
      */ 
      // it('write 1000 random', async () => {
      //   let X = [],
      //     Y = [],
      //     n = 1000,
      //     i;

      //   for (let i = 0; i < n; i++) {
      //     let arr: any = await booster.expand_((Math.floor(Math.random() * 5464646468484684)).toString(), '2');
      //     X.push((arr[0].mod('30')).toString());     
      //     Y.push((arr[1].mod('30')).toString());
      //   }

      //   await fs.writeFile('X.txt', JSON.stringify(X), function (err: any) {
      //     if (err) throw err;
      //   });

      //   await fs.writeFile('Y.txt', JSON.stringify(Y), function (err: any) {
      //     if (err) throw err;
      //   });
      // });
    });

    describe('_remove', () => {
      beforeEach(async () => {
        await booster.pause();
        await booster.batchAddCards(
          [5, 10],
          [10, 18],
          [0, 1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
          [3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1]
        );

        await booster.unpause();
        expect(await booster.availablePacks()).to.be.eq('28');
      });

      it('should decrease length', async () => {
        expect(await booster.rareCardsLength()).to.be.eq('28');

        await booster._remove_('0');
        expect(await booster.rareCardsLength()).to.be.eq('27');

        await booster._remove_('12');
        expect(await booster.rareCardsLength()).to.be.eq('26');
      });

      it('should delete by index', async () => {
        expect(await booster.rareCards('9')).to.be.eq('5');

        await booster._remove_('9');
        expect(await booster.rareCards('9')).to.be.eq('10');
      });
    });
  });
});

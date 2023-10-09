import {Blockchain, printTransactionFees, SandboxContract} from '@ton-community/sandbox';
import { Cell, toNano, beginCell, Address } from 'ton-core';
import {Fireworks, Opcodes} from '../wrappers/Fireworks';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';



describe('Direct Tests', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Fireworks');
    });

    let blockchain: Blockchain;
    let fireworks: SandboxContract<Fireworks>;
    let launched_f1: SandboxContract<Fireworks>;
    let launched_f2: SandboxContract<Fireworks>;


    beforeEach(async () => {
        blockchain = await Blockchain.create();

        blockchain.verbosity = {
            ...blockchain.verbosity,
            blockchainLogs: true,
            vmLogs: 'vm_logs_full',
            debugLogs: true,
            print: false,
        }

        fireworks = blockchain.openContract(
            Fireworks.createFromConfig(
                {
                    id: 0,
                },
                code
            )
        );

        launched_f1= blockchain.openContract(
            Fireworks.createFromConfig(
                {
                    id: 1,
                },
                code
            )
        );

        launched_f2= blockchain.openContract(
            Fireworks.createFromConfig(
                {
                    id: 2,
                },
                code
            )
        );



        const deployer = await blockchain.treasury('deployer');

        const deployResult = await fireworks.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: fireworks.address,
            deploy: true,
            success: true,
        });
    });


    it('first transaction[ID:1] should set fireworks successfully', async () => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendDeployLaunch(launcher.getSender(), toNano('2.5'));


        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: true,
            op: Opcodes.set_first
        })

    });


    it('should exist a transaction[ID:2] which launch first fireworks successfully', async () => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendDeployLaunch(launcher.getSender(), toNano('2.5'));

        expect(launchResult.transactions).toHaveTransaction({
            from: fireworks.address,
            to: launched_f1.address,
            success: true,
            op: Opcodes.launch_first,
            outMessagesCount: 4,
            destroyed: true,
            endStatus: "non-existing",
        })

        printTransactionFees(launchResult.transactions);

    });


    it('should exist a transaction[ID:3] which launch second fireworks successfully', async () => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendDeployLaunch(launcher.getSender(), toNano('2.5'));

        expect(launchResult.transactions).toHaveTransaction({
            from: fireworks.address,
            to: launched_f2.address,
            success: true,
            op: Opcodes.launch_second,
            outMessagesCount: 1
        })

        printTransactionFees(launchResult.transactions);

    });



    it('should exist a transaction[ID:4] with a comment send mode = 0', async() => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendDeployLaunch(
            launcher.getSender(),
            toNano('2.5'),
        );

        expect(launchResult.transactions).toHaveTransaction({
            from: launched_f1.address,
            to: launcher.address,
            success: true,
            body: beginCell().storeUint(0,32).storeStringTail("send mode = 0").endCell() // 0x00000000 comment opcode and encoded comment

        });
    })


    it('should exist a transaction[ID:5] with a comment send mode = 1', async() => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendDeployLaunch(
            launcher.getSender(),
            toNano('2.5'),
        );

        expect(launchResult.transactions).toHaveTransaction({
            from: launched_f1.address,
            to: launcher.address,
            success: true,
            body: beginCell().storeUint(0,32).storeStringTail("send mode = 1").endCell() // 0x00000000 comment opcode and encoded comment
        });

    })

    it('should exist a transaction[ID:6] with a comment send mode = 2', async() => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendDeployLaunch(
            launcher.getSender(),
            toNano('2.5'),
        );

        expect(launchResult.transactions).toHaveTransaction({
            from: launched_f1.address,
            to: launcher.address,
            success: true,
            body: beginCell().storeUint(0,32).storeStringTail("send mode = 2").endCell() // 0x00000000 comment opcode and encoded comment
        });

    })

    it('should exist a transaction[ID:7] with a comment send mode = 32 + 128', async() => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendDeployLaunch(
            launcher.getSender(),
            toNano('2.5'),
        );

        expect(launchResult.transactions).toHaveTransaction({
            from: launched_f1.address,
            to: launcher.address,
            success: true,
            body: beginCell().storeUint(0,32).storeStringTail("send mode = 32 + 128").endCell() // 0x00000000 comment opcode and encoded comment
        });
    })


    it('should exist a transaction[ID:8] with a comment send mode = 64', async() => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendDeployLaunch(
            launcher.getSender(),
            toNano('2.5'),
        );

        expect(launchResult.transactions).toHaveTransaction({
            from: launched_f2.address,
            to: launcher.address,
            success: true,
            body: beginCell().storeUint(0,32).storeStringTail("send_mode = 64").endCell() // 0x00000000 comment opcode and encoded comment

        });

    })

    it('transaction in fireworks failed on Action Phase because insufficient funds ', async() => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendDeployLaunch(
            launcher.getSender(),
            toNano('2.0'),
        );

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            actionResultCode : 37,
            // exit code = Not enough TON. Message sends too much TON (or there is not enough TON after deducting fees). https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: Opcodes.set_first

        });

    })



    it('transactions should be processed with expected fees', async() => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendDeployLaunch(
            launcher.getSender(),
            toNano('2.5'),
        );

        //totalFee
        console.log('total fees = ', launchResult.transactions[1].totalFees);

        const tx1 = launchResult.transactions[1];
        if (tx1.description.type !== 'generic') {
            throw new Error('Generic transaction expected');
        }

        //computeFee
        const computeFee = tx1.description.computePhase.type === 'vm' ? tx1.description.computePhase.gasFees : undefined;
        console.log('computeFee = ', computeFee);

        //actionFee
        const actionFee = tx1.description.actionPhase?.totalActionFees;
        console.log('actionFee = ', actionFee);


        if ((computeFee == null || undefined) ||
            (actionFee == null || undefined)) {
            throw new Error('undefined fees');
        }

        //The check, if Compute Phase and Action Phase fees exceed 1 TON
        expect(computeFee + actionFee).toBeLessThan(toNano('1'));

        console.log(printTransactionFees(launchResult.transactions));

        console.log('launcher address = ', launcher.address);
        console.log('fireworks address = ', fireworks.address);
        console.log('launched_f1 address = ', launched_f1.address);
        console.log('launched_f2 address = ', launched_f2.address);

    });

});






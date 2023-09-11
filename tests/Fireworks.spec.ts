import {Blockchain, printTransactionFees, SandboxContract} from '@ton-community/sandbox';
import { Cell, toNano, beginCell, Address } from 'ton-core';
import { Fireworks } from '../wrappers/Fireworks';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';



describe('Fireworks', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Fireworks');
    });

    let blockchain: Blockchain;
    let fireworks: SandboxContract<Fireworks>;


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

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await fireworks.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: fireworks.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and fireworks are ready to use
    });

    it('should set first fireworks', async () => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendDeployLaunch(launcher.getSender(), toNano('1.5'));


        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            op: 0x5720cfeb //set_first
        })

    });


    it('should launch first fireworks', async () => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendDeployLaunch(launcher.getSender(), toNano('2.5'));
        
        expect(launchResult.transactions).toHaveTransaction({
            from: fireworks.address,
            op: 0x6efe144b //launch_first
        })

        printTransactionFees(launchResult.transactions);

    });

    it('should send tranasaction to first fireworks', async () => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendDeployLaunch(launcher.getSender(), toNano('2.5'));

        const init_code = code;
        const init_data = beginCell().storeUint(1, 32).endCell();


        const state_init = beginCell()
            .storeUint(0, 1) //no split_depth
            .storeUint(0, 1) // no special
            .storeUint(1, 1) // we have code
            .storeRef(init_code)
            .storeUint(1, 1) // we have data
            .storeRef(init_data)
            .storeUint(0, 1) // we have no library
            .endCell();

        const hash_dst = state_init.hash
        if (hash_dst === null) {
            throw Error("wrong type");
        }


        let launched_f1_address = new Address(0, hash_dst());


        expect(launchResult.transactions).toHaveTransaction({
            from: fireworks.address,
            to: launched_f1_address,
            op: 0x6efe144b
        })

    });

  it('should send tranasaction to second fireworks', async () => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendDeployLaunch(launcher.getSender(), toNano('3.5'));

        const init_code = code;
        const init_data = beginCell().storeUint(2, 32).endCell();


        const state_init = beginCell()
            .storeUint(0, 1) //no split_depth
            .storeUint(0, 1) // no special
            .storeUint(1, 1) // we have code
            .storeRef(init_code)
            .storeUint(1, 1) // we have data
            .storeRef(init_data)
            .storeUint(0, 1) // we have no library
            .endCell();

        const hash_dst = state_init.hash
        if (hash_dst === null) {
            throw Error("wrong type");
        }


        let launched_f2_address = new Address(0, hash_dst());


        expect(launchResult.transactions).toHaveTransaction({
            from: fireworks.address,
            to: launched_f2_address,
            op: 0xa2e2c2dc
        })

    });




    it('should launch fireworks', async () => {

        const launcher = await blockchain.treasury('launcher');
        console.log('launcher = ', launcher.address);
        console.log('Fireworks = ', fireworks.address);


        const launchResult = await fireworks.sendDeployLaunch(
            launcher.getSender(),
            toNano('3.5'),
        );

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: true,
        });
    });


    it('should destroy after launching', async () => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendDeployLaunch(
            launcher.getSender(),
            toNano('3.5'),
        );

        const init_code = code;
        const init_data = beginCell().storeUint(1, 32).endCell();


        const state_init = beginCell()
            .storeUint(0, 1) //no split_depth
            .storeUint(0, 1) // no special
            .storeUint(1, 1) // we have code
            .storeRef(init_code)
            .storeUint(1, 1) // we have data
            .storeRef(init_data)
            .storeUint(0, 1) // we have no library
            .endCell();

        const hash_dst = state_init.hash
        if (hash_dst === null) {
            throw Error("wrong type");
        }


        let launched_f1_address = new Address(0, hash_dst());


        expect(launchResult.transactions).toHaveTransaction({
            from: fireworks.address,
            to: launched_f1_address,
            success: true,
            endStatus: 'non-existing',
            destroyed: true
        });

    });



    it('should be correct op code for the launching first fireworks', async () => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendDeployLaunch(
            launcher.getSender(),
            toNano('3.5'),
        );

        const init_code = code;
        const init_data = beginCell().storeUint(1, 32).endCell();


        const state_init = beginCell()
            .storeUint(0, 1) //no split_depth
            .storeUint(0, 1) // no special
            .storeUint(1, 1) // we have code
            .storeRef(init_code)
            .storeUint(1, 1) // we have data
            .storeRef(init_data)
            .storeUint(0, 1) // we have no library
            .endCell();

        const hash_dst = state_init.hash
        if (hash_dst === null) {
            throw Error("wrong type");
        }


        let launched_f1_address = new Address(0, hash_dst());


        expect(launchResult.transactions).toHaveTransaction({
            from: fireworks.address,
            to: launched_f1_address,
            success: true,
            op: 0x6efe144b, // 'launch_first' op code
            outMessagesCount: 4
        });

        expect(launchResult.transactions).toHaveTransaction({
            from: launched_f1_address,
            to: launcher.address,
            success: true,
            op: 0 // 0x00000000 - comment op code
        });

    });


    it('should be correct op code for the launching second fireworks', async () => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendDeployLaunch(
            launcher.getSender(),
            toNano('3.5'),
        );

        const init_code = code;
        const init_data = beginCell().storeUint(2, 32).endCell();


        const state_init = beginCell()
            .storeUint(0, 1) //no split_depth
            .storeUint(0, 1) // no special
            .storeUint(1, 1) // we have code
            .storeRef(init_code)
            .storeUint(1, 1) // we have data
            .storeRef(init_data)
            .storeUint(0, 1) // we have no library
            .endCell();

        const hash_dst = state_init.hash
        if (hash_dst === null) {
            throw Error("wrong type");
        }


        let launched_f2_address = new Address(0, hash_dst());


        expect(launchResult.transactions).toHaveTransaction({
            from: fireworks.address,
            to: launched_f2_address,
            success: true,
            op: 0xa2e2c2dc, // 'launch_second' op code,
            outMessagesCount: 1
        });

        expect(launchResult.transactions).toHaveTransaction({
            from: launched_f2_address,
            to: launcher.address,
            success: true,
            op: 0 // 0x00000000 - comment op code
        });

    });


    it('fireworks contract should send msgs with comments in first fireworks', async() => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendDeployLaunch(
            launcher.getSender(),
            toNano('3.5'),
        );

        const init_code = code;
        const init_data = beginCell().storeUint(1, 32).endCell();


        const state_init = beginCell()
            .storeUint(0, 1) //no split_depth
            .storeUint(0, 1) // no special
            .storeUint(1, 1) // we have code
            .storeRef(init_code)
            .storeUint(1, 1) // we have data
            .storeRef(init_data)
            .storeUint(0, 1) // we have no library
            .endCell();

        const hash_dst = state_init.hash
        if (hash_dst === null) {
            throw Error("wrong type");
        }


        let launched_f1_address = new Address(0, hash_dst());



        expect(launchResult.transactions).toHaveTransaction({
            from: launched_f1_address,
            to: launcher.address,
            success: true,
            body: beginCell().storeUint(0,32).storeStringTail("send mode = 0").endCell() // 0x00000000 comment opcode and encoded comment

        });

        expect(launchResult.transactions).toHaveTransaction({
            from: launched_f1_address,
            to: launcher.address,
            success: true,
            body: beginCell().storeUint(0,32).storeStringTail("send mode = 1").endCell()
        });

        expect(launchResult.transactions).toHaveTransaction({
            from: launched_f1_address,
            to: launcher.address,
            success: true,
            body: beginCell().storeUint(0,32).storeStringTail("send mode = 2").endCell()
        });

        expect(launchResult.transactions).toHaveTransaction({
            from: launched_f1_address,
            to: launcher.address,
            success: true,
            body: beginCell().storeUint(0,32).storeStringTail("send mode = 32 + 128").endCell()
        });
    })


    it('fireworks contract should send msgs with comments in second fireworks', async() => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendDeployLaunch(
            launcher.getSender(),
            toNano('3.5'),
        );

        const init_code = code;
        const init_data = beginCell().storeUint(2, 32).endCell();


        const state_init = beginCell()
            .storeUint(0, 1) //no split_depth
            .storeUint(0, 1) // no special
            .storeUint(1, 1) // we have code
            .storeRef(init_code)
            .storeUint(1, 1) // we have data
            .storeRef(init_data)
            .storeUint(0, 1) // we have no library
            .endCell();

        const hash_dst = state_init.hash
        if (hash_dst === null) {
            throw Error("wrong type");
        }


        let launched_f2_address = new Address(0, hash_dst());



        expect(launchResult.transactions).toHaveTransaction({
            from: launched_f2_address,
            to: launcher.address,
            success: true,
            body: beginCell().storeUint(0,32).storeStringTail("send_mode = 64").endCell() // 0x00000000 comment opcode and encoded comment

        });

    })


    it('should be executed and print fees', async() => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendDeployLaunch(
            launcher.getSender(),
            toNano('3.5'),
        );

        console.log(printTransactionFees(launchResult.transactions));

    });


    it('should be executed with expected fees', async() => {

        const launcher = await blockchain.treasury('launcher');

        const launchResult = await fireworks.sendDeployLaunch(
            launcher.getSender(),
            toNano('3.5'),
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


    });



});




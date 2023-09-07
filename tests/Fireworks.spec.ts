import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { Cell, toNano, beginCell } from 'ton-core';
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
            print: true,
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

        const launchResult = await fireworks.sendDeployLaunch(launcher.getSender(), toNano('1.5'));


        expect(launchResult.transactions).toHaveTransaction({
            from: fireworks.address,
            op: 0x6efe144b //launch_first
        })

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

        let address = beginCell().storeInt(0, 8).storeUint(hash_dst. , 256).endCell();

        slice dest_address = begin_cell().store_int(0, 8).store_uint(state_init_hash, 256).end_cell().begin_parse();



    });
});



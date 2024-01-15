import { Blockchain, BlockchainSnapshot, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, beginCell } from '@ton/core';
import { ExitCode, Fireworks, OPCODES } from '../wrappers/Fireworks';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import * as fs from 'fs';

describe('Edge Cases Tests', () => {
    let code: Cell;
    let blockchain: Blockchain;
    let fireworks: SandboxContract<Fireworks>;
    let launched_f1: SandboxContract<Fireworks>;
    let launched_f2: SandboxContract<Fireworks>;

    let launcher: SandboxContract<TreasuryContract>;
    let initialState: BlockchainSnapshot;

    beforeAll(async () => {
        code = await compile('Fireworks');

        blockchain = await Blockchain.create();
        blockchain.verbosity = {
            ...blockchain.verbosity,
            blockchainLogs: true,
            vmLogs: 'vm_logs_full',
            debugLogs: true,
            print: false,
        };

        launcher = await blockchain.treasury('launcher');

        fireworks = blockchain.openContract(
            Fireworks.createFromConfig(
                {
                    id: 0,
                },
                code
            )
        );

        launched_f1 = blockchain.openContract(
            Fireworks.createFromConfig(
                {
                    id: 1,
                },
                code
            )
        );

        launched_f2 = blockchain.openContract(
            Fireworks.createFromConfig(
                {
                    id: 2,
                },
                code
            )
        );

        const deployer = await blockchain.treasury('deployer');
        const deployResult = await fireworks.sendDeploy(deployer.getSender(), toNano('100'));
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: fireworks.address,
            deploy: true,
            success: true,
        });

        initialState = blockchain.snapshot();
    });

    afterEach(async () => {
        await blockchain.loadFrom(initialState);
    });

    it('compute | exit code = 0', async () => {
        const body = beginCell().storeUint(OPCODES.FAKED_LAUNCH, 32).storeUint(ExitCode.Success, 8).endCell();
        const launchResult = await fireworks.sendBadMessage(launcher.getSender(), toNano('2.0'), body);

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: true,
            exitCode: ExitCode.Success,
            // exit code = 8  Cell overflow.  Writing to builder is not possible since after operation there would be more than 1023 bits or 4 references.. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.FAKED_LAUNCH,
        });
    });

    it('compute | exit code = 1', async () => {
        const body = beginCell().storeUint(OPCODES.FAKED_LAUNCH, 32).storeUint(ExitCode.SuccessAlt, 8).endCell();
        const launchResult = await fireworks.sendBadMessage(launcher.getSender(), toNano('2.0'), body);

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: true,
            exitCode: ExitCode.SuccessAlt,
            // exit code = 8  Cell overflow.  Writing to builder is not possible since after operation there would be more than 1023 bits or 4 references.. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.FAKED_LAUNCH,
        });
    });

    it('compute | exit code = 2', async () => {
        const body = beginCell().storeUint(OPCODES.FAKED_LAUNCH, 32).storeUint(ExitCode.StackUnderflow, 8).endCell();
        const launchResult = await fireworks.sendBadMessage(launcher.getSender(), toNano('2.0'), body);

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            exitCode: ExitCode.StackUnderflow,
            // exit code = 8  Cell overflow.  Writing to builder is not possible since after operation there would be more than 1023 bits or 4 references.. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.FAKED_LAUNCH,
        });
    });

    it('compute | exit code = 3', async () => {
        const body = beginCell().storeUint(OPCODES.FAKED_LAUNCH, 32).storeUint(ExitCode.StackOverflow, 8).endCell();
        const launchResult = await fireworks.sendBadMessage(launcher.getSender(), toNano('2.0'), body);

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            exitCode: ExitCode.StackOverflow,
            // exit code = 8  Cell overflow.  Writing to builder is not possible since after operation there would be more than 1023 bits or 4 references.. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.FAKED_LAUNCH,
        });
    });

    it('compute | exit code = 4', async () => {
        const maxUint256 = 115792089237316195423570985008687907853269984665640564039457584007913129639935n;
        const body = beginCell()
            .storeUint(OPCODES.FAKED_LAUNCH, 32)
            .storeUint(ExitCode.IntegerOverflow, 8)
            .storeUint(maxUint256, 256)
            .endCell();
        const launchResult = await fireworks.sendBadMessage(launcher.getSender(), toNano('2.0'), body);
        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            exitCode: ExitCode.IntegerOverflow,
            // exit code = 8  Cell overflow.  Writing to builder is not possible since after operation there would be more than 1023 bits or 4 references.. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.FAKED_LAUNCH,
        });
    });

    it('compute | exit code = 5', async () => {
        const negativeNumber = -5;
        const body = beginCell()
            .storeUint(OPCODES.FAKED_LAUNCH, 32)
            .storeUint(ExitCode.IntegerOutOfRange, 8)
            .storeInt(negativeNumber, 8)
            .endCell();
        const launchResult = await fireworks.sendBadMessage(launcher.getSender(), toNano('2.0'), body);
        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            exitCode: ExitCode.IntegerOutOfRange,
            // exit code = 8  Cell overflow.  Writing to builder is not possible since after operation there would be more than 1023 bits or 4 references.. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.FAKED_LAUNCH,
        });
    });

    it('compute | exit code = 6', async () => {
        const body = beginCell().storeUint(OPCODES.FAKED_LAUNCH, 32).storeUint(ExitCode.InvalidOpcode, 8).endCell();
        const launchResult = await fireworks.sendBadMessage(launcher.getSender(), toNano('2.0'), body);

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            exitCode: ExitCode.InvalidOpcode,
            // exit code = 8  Cell overflow.  Writing to builder is not possible since after operation there would be more than 1023 bits or 4 references.. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.FAKED_LAUNCH,
        });
    });

    it('compute | exit code = 7', async () => {
        const body = beginCell().storeUint(OPCODES.FAKED_LAUNCH, 32).storeUint(ExitCode.TypeCheckError, 8).endCell();
        const launchResult = await fireworks.sendBadMessage(launcher.getSender(), toNano('2.0'), body);
        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            exitCode: ExitCode.TypeCheckError,
            // exit code = 8  Cell overflow.  Writing to builder is not possible since after operation there would be more than 1023 bits or 4 references.. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.FAKED_LAUNCH,
        });
    });

    it('compute | exit code = 8', async () => {
        const body = beginCell()
            .storeUint(OPCODES.FAKED_LAUNCH, 32)
            .storeUint(ExitCode.CellOverflow, 8)
            .storeRef(beginCell().storeUint(1, 256).storeUint(2, 256).storeUint(3, 256).storeUint(4, 255).endCell()) // 1023 bits cell
            .endCell();
        const launchResult = await fireworks.sendBadMessage(launcher.getSender(), toNano('2.0'), body);

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            exitCode: ExitCode.CellOverflow,
            // exit code = 8  Cell overflow.  Writing to builder is not possible since after operation there would be more than 1023 bits or 4 references.. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.FAKED_LAUNCH,
        });
    });

    it('compute | exit code = 9', async () => {
        const body = beginCell()
            .storeUint(OPCODES.FAKED_LAUNCH, 32)
            .storeUint(ExitCode.CellUnderflow, 8)
            .storeRef(beginCell().endCell())
            .endCell();
        const launchResult = await fireworks.sendBadMessage(launcher.getSender(), toNano('2.0'), body);

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            exitCode: ExitCode.CellUnderflow,
            // exit code = 9 Stack underflow. Last TVM op-code consumed more elements than there are on the stacks. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.FAKED_LAUNCH,
        });
    });

    it('compute | exit code = 10', async () => {
        const body = beginCell()
            .storeUint(OPCODES.FAKED_LAUNCH, 32)
            .storeUint(ExitCode.DictionaryError, 8)
            .storeRef(beginCell().endCell())
            .endCell();
        const launchResult = await fireworks.sendBadMessage(launcher.getSender(), toNano('2.0'), body);

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            exitCode: ExitCode.DictionaryError,
            // exit code = 9 Stack underflow. Last TVM op-code consumed more elements than there are on the stacks. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.FAKED_LAUNCH,
        });
    });

    it('compute | exit code = 11', async () => {
        const body = beginCell()
            .storeUint(OPCODES.FAKED_LAUNCH, 32)
            .storeUint(ExitCode.UnknownError, 8)
            .storeRef(beginCell().endCell())
            .endCell();
        const launchResult = await fireworks.sendBadMessage(launcher.getSender(), toNano('2.0'), body);

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            exitCode: ExitCode.UnknownError,
            // exit code = 9 Stack underflow. Last TVM op-code consumed more elements than there are on the stacks. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.FAKED_LAUNCH,
        });
    });

    it('compute | exit code = -14', async () => {
        const body = beginCell()
            .storeUint(OPCODES.FAKED_LAUNCH, 32)
            .storeUint(ExitCode.OutOfGasError, 8)
            .storeRef(beginCell().endCell())
            .endCell();
        const launchResult = await fireworks.sendBadMessage(launcher.getSender(), toNano('0.003'), body);

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            exitCode: ExitCode.OutOfGasErrorAlt,
            // exit code = 9 Stack underflow. Last TVM op-code consumed more elements than there are on the stacks. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.FAKED_LAUNCH,
        });
    });

    it('action | exit code = 32', async () => {
        const body = beginCell()
            .storeUint(OPCODES.FAKED_LAUNCH, 32)
            .storeUint(ExitCode.ActionListInvalid, 8)
            .storeRef(beginCell().endCell())
            .endCell();
        const launchResult = await fireworks.sendBadMessage(launcher.getSender(), toNano('1'), body);

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            actionResultCode: ExitCode.ActionListInvalid,
            // exit code = 9 Stack underflow. Last TVM op-code consumed more elements than there are on the stacks. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.FAKED_LAUNCH,
        });
    });

    it('action | exit code = 33', async () => {
        const body = beginCell()
            .storeUint(OPCODES.FAKED_LAUNCH, 32)
            .storeUint(ExitCode.ActionListTooLong, 8)
            .storeRef(beginCell().endCell())
            .endCell();
        const launchResult = await fireworks.sendBadMessage(launcher.getSender(), toNano('1'), body);

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            actionResultCode: ExitCode.ActionListTooLong,
            // exit code = 9 Stack underflow. Last TVM op-code consumed more elements than there are on the stacks. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.FAKED_LAUNCH,
        });
    });

    it('action | exit code = 34', async () => {
        const body = beginCell()
            .storeUint(OPCODES.FAKED_LAUNCH, 32)
            .storeUint(ExitCode.ActionInvalid, 8)
            .storeRef(beginCell().endCell())
            .endCell();
        const launchResult = await fireworks.sendBadMessage(launcher.getSender(), toNano('1'), body);

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            actionResultCode: ExitCode.ActionInvalid,
            // exit code = 9 Stack underflow. Last TVM op-code consumed more elements than there are on the stacks. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.FAKED_LAUNCH,
        });
    });

    it('action | exit code = 35', async () => {
        const body = beginCell()
            .storeUint(OPCODES.FAKED_LAUNCH, 32)
            .storeUint(ExitCode.InvalidSrcAddr, 8)
            .storeRef(beginCell().endCell())
            .endCell();
        const launchResult = await fireworks.sendBadMessage(launcher.getSender(), toNano('1'), body);

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            actionResultCode: ExitCode.InvalidSrcAddr,
            // exit code = 9 Stack underflow. Last TVM op-code consumed more elements than there are on the stacks. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.FAKED_LAUNCH,
        });
    });

    it('action | exit code = 36', async () => {
        const body = beginCell()
            .storeUint(OPCODES.FAKED_LAUNCH, 32)
            .storeUint(ExitCode.InvalidDstAddr, 8)
            .storeRef(beginCell().endCell())
            .endCell();
        const launchResult = await fireworks.sendBadMessage(launcher.getSender(), toNano('1'), body);

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            actionResultCode: ExitCode.InvalidDstAddr,
            // exit code = 9 Stack underflow. Last TVM op-code consumed more elements than there are on the stacks. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.FAKED_LAUNCH,
        });
    });

    it('action | exit code = 37', async () => {
        const body = beginCell()
            .storeUint(OPCODES.FAKED_LAUNCH, 32)
            .storeUint(ExitCode.NotEnoughTON, 8)
            .storeRef(beginCell().endCell())
            .endCell();
        const launchResult = await fireworks.sendBadMessage(launcher.getSender(), toNano('1'), body);

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            actionResultCode: ExitCode.NotEnoughTON,
            // exit code = 9 Stack underflow. Last TVM op-code consumed more elements than there are on the stacks. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.FAKED_LAUNCH,
        });
    });

    it('action | exit code = 38', async () => {
        const body = beginCell()
            .storeUint(OPCODES.FAKED_LAUNCH, 32)
            .storeUint(ExitCode.NotEnoughExtraCurrencies, 8)
            .storeRef(beginCell().endCell())
            .endCell();
        const launchResult = await fireworks.sendBadMessage(launcher.getSender(), toNano('1'), body);

        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            actionResultCode: ExitCode.NotEnoughExtraCurrencies,
            // exit code = 9 Stack underflow. Last TVM op-code consumed more elements than there are on the stacks. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.FAKED_LAUNCH,
        });
    });

    it('action | exit code = 40', async () => {
        const body = beginCell()
            .storeUint(OPCODES.FAKED_LAUNCH, 32)
            .storeUint(ExitCode.NotEnoughFounds, 8)
            .storeRef(beginCell().endCell())
            .endCell();
        const launchResult = await fireworks.sendBadMessage(launcher.getSender(), toNano('1'), body);
        fs.writeFileSync('test.json', JSON.stringify(launchResult.transactions[1].vmLogs, null, 2));
        expect(launchResult.transactions).toHaveTransaction({
            from: launcher.address,
            to: fireworks.address,
            success: false,
            aborted: true,
            actionResultCode: ExitCode.NotEnoughFounds,
            // exit code = 9 Stack underflow. Last TVM op-code consumed more elements than there are on the stacks. https://docs.ton.org/learn/tvm-instructions/tvm-exit-codes
            op: OPCODES.FAKED_LAUNCH,
        });
    });
});

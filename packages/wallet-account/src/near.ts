/**
 * This module contains the main class developers will use to interact with NEAR.
 * The {@link Near} class is used to interact with {@link "@near-js/accounts".account.Account | Account} through the {@link "@near-js/providers".json-rpc-provider.JsonRpcProvider | JsonRpcProvider}.
 * It is configured via the {@link NearConfig}.
 * 
 * @see [https://docs.near.org/tools/near-api-js/quick-reference#account](https://docs.near.org/tools/near-api-js/quick-reference#account)
 * 
 * @module near
 */
import {
    Account,
    AccountCreator,
    Connection,
    LocalAccountCreator,
    UrlAccountCreator,
} from '@near-js/accounts';
import { PublicKey } from '@near-js/crypto';
import { KeyStore } from '@near-js/keystores';
import { Signer } from '@near-js/signers';
import BN from 'bn.js';

export interface NearConfig {
    /** Holds {@link "@near-js/crypto".key_pair.KeyPair | KeyPair} for signing transactions */
    keyStore?: KeyStore;

    /** @hidden */
    signer?: Signer;

    /**
     * [NEAR Contract Helper](https://github.com/near/near-contract-helper) url used to create accounts if no master account is provided
     * @see {@link UrlAccountCreator}
     */
    helperUrl?: string;

    /**
     * The balance transferred from the {@link NearConfig#masterAccount} to a created account
     * @see {@link LocalAccountCreator}
     */
    initialBalance?: string;

    /**
     * The account to use when creating new accounts
     * @see {@link LocalAccountCreator}
     */
    masterAccount?: string;

    /**
     * {@link "@near-js/crypto".key_pair.KeyPair | KeyPair} are stored in a {@link KeyStore} under the `networkId` namespace.
     */
    networkId: string;

    /**
     * NEAR RPC API url. used to make JSON RPC calls to interact with NEAR.
     * @see {@link "@near-js/providers".json-rpc-provider.JsonRpcProvider | JsonRpcProvider}
     */
    nodeUrl: string;

    /**
     * NEAR RPC API headers. Can be used to pass API KEY and other parameters.
     * @see {@link "@near-js/providers".json-rpc-provider.JsonRpcProvider | JsonRpcProvider}
     */
    headers?: { [key: string]: string | number };

    /**
     * NEAR wallet url used to redirect users to their wallet in browser applications.
     * @see [https://wallet.near.org/](https://wallet.near.org/)
     */
    walletUrl?: string;

    /**
     * JVSM account ID for NEAR JS SDK
     */
    jsvmAccountId?: string;

    /**
     * Backward-compatibility for older versions
     */
    deps?: { keyStore: KeyStore };
}

/**
 * This is the main class developers should use to interact with NEAR.
 * @example
 * ```js
 * const near = new Near(config);
 * ```
 */
export class Near {
    readonly config: any;
    readonly connection: Connection;
    readonly accountCreator: AccountCreator;

    constructor(config: NearConfig) {
        this.config = config;
        this.connection = Connection.fromConfig({
            networkId: config.networkId,
            provider: { type: 'JsonRpcProvider', args: { url: config.nodeUrl, headers: config.headers } },
            signer: config.signer || { type: 'InMemorySigner', keyStore: config.keyStore || config.deps?.keyStore },
            jsvmAccountId: config.jsvmAccountId || `jsvm.${config.networkId}`
        });
        
        if (config.masterAccount) {
            // TODO: figure out better way of specifiying initial balance.
            // Hardcoded number below must be enough to pay the gas cost to dev-deploy with near-shell for multiple times
            const initialBalance = config.initialBalance ? new BN(config.initialBalance) : new BN('500000000000000000000000000');
            this.accountCreator = new LocalAccountCreator(new Account(this.connection, config.masterAccount), initialBalance);
        } else if (config.helperUrl) {
            this.accountCreator = new UrlAccountCreator(this.connection, config.helperUrl);
        } else {
            this.accountCreator = null;
        }
    }

    /**
     * @param accountId near accountId used to interact with the network.
     */
    async account(accountId: string): Promise<Account> {
        const account = new Account(this.connection, accountId);
        return account;
    }

    /**
     * Create an account using the {@link AccountCreator}. Either:
     * * using a masterAccount with {@link LocalAccountCreator}
     * * using the helperUrl with {@link UrlAccountCreator}
     * @see {@link NearConfig#masterAccount} and {@link NearConfig#helperUrl}
     * 
     * @param accountId
     * @param publicKey
     */
    async createAccount(accountId: string, publicKey: PublicKey): Promise<Account> {
        if (!this.accountCreator) {
            throw new Error('Must specify account creator, either via masterAccount or helperUrl configuration settings.');
        }
        await this.accountCreator.createAccount(accountId, publicKey);
        return new Account(this.connection, accountId);
    }
}

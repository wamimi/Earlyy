-- Apply after early_monad_v3.sql. A bundler transaction may contain claims for multiple wallets.
begin;
alter table public.early_chain_receipts drop constraint early_chain_receipts_pkey;
update public.early_chain_receipts set wallet = lower(wallet);
alter table public.early_chain_receipts add primary key (chain_id, tx_hash, wallet);
commit;

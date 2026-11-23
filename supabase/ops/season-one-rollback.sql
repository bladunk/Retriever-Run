-- Owner-operated rollback only. This retains both boards, all receipts, and all identities.
-- The trigger increments the generation when the active competition changes.
begin;
update retriever_camp.season_control
set active = 'preseason'
where singleton and active = 'season-one';
select active, generation from retriever_camp.season_control where singleton;
commit;

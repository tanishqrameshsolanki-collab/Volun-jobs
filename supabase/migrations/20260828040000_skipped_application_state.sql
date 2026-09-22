-- Keep a user skip distinct from a withdrawn application that was previously submitted.
alter table applications drop constraint if exists applications_status_check;
alter table applications add constraint applications_status_check check (status in ('DISCOVERED', 'QUALIFIED', 'TAILORING', 'READY_FOR_REVIEW', 'APPROVED', 'APPLYING', 'SUBMITTED', 'OA', 'INTERVIEW', 'REJECTED', 'OFFER', 'WITHDRAWN', 'SKIPPED', 'MANUAL_REQUIRED', 'ERROR'));

alter table application_state_transitions
  drop constraint if exists application_state_transitions_from_status_check;
alter table application_state_transitions
  drop constraint if exists application_state_transitions_to_status_check;
alter table application_state_transitions
  add constraint application_state_transitions_from_status_check check (from_status is null or from_status in ('DISCOVERED', 'QUALIFIED', 'TAILORING', 'READY_FOR_REVIEW', 'APPROVED', 'APPLYING', 'SUBMITTED', 'OA', 'INTERVIEW', 'REJECTED', 'OFFER', 'WITHDRAWN', 'SKIPPED', 'MANUAL_REQUIRED', 'ERROR'));
alter table application_state_transitions
  add constraint application_state_transitions_to_status_check check (to_status in ('DISCOVERED', 'QUALIFIED', 'TAILORING', 'READY_FOR_REVIEW', 'APPROVED', 'APPLYING', 'SUBMITTED', 'OA', 'INTERVIEW', 'REJECTED', 'OFFER', 'WITHDRAWN', 'SKIPPED', 'MANUAL_REQUIRED', 'ERROR'));

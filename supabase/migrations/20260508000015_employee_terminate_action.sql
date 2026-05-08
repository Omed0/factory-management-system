-- Add TERMINATE to the employee_action_type enum.
-- Recording a TERMINATE action documents the reason and date of termination.
-- The app-layer server fn also soft-deletes the employee row after inserting this action.
alter type public.employee_action_type add value if not exists 'TERMINATE';

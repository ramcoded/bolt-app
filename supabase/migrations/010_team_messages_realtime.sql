-- Enable Supabase Realtime for team_messages so postgres_changes listeners fire
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;

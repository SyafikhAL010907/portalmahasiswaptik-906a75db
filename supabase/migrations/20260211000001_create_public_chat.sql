-- Create public_chat_messages table for Global Chat
CREATE TABLE IF NOT EXISTS public.public_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.public_chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read messages
CREATE POLICY "Allow authenticated users to read public chat messages" 
ON public.public_chat_messages 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow all authenticated users to insert messages
CREATE POLICY "Allow authenticated users to insert public chat messages" 
ON public.public_chat_messages 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Create index for performance on fetching last 24h
CREATE INDEX IF NOT EXISTS idx_chat_created_at ON public.public_chat_messages(created_at DESC);

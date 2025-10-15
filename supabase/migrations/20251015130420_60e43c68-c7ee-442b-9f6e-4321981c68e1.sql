-- Adicionar usuário atual como admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('3cf7964a-2cf8-4260-87ff-8f7b0ee4fb63', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
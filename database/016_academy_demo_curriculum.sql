-- 016_academy_demo_curriculum.sql
-- Grade demonstrativa para a equipe visualizar e substituir pelo conteúdo definitivo no admin.

insert into universe.academy_modules (course_id, title, description, sort_order)
select c.id, template.title, template.description, template.sort_order
  from universe.academy_courses c
 cross join (values
   ('Fundamentos e preparação', 'Conteúdo demonstrativo: conceitos, materiais, diagnóstico e segurança.', 10),
   ('Aplicação passo a passo', 'Conteúdo demonstrativo: preparação, execução técnica e acabamento.', 20),
   ('Manutenção e carreira', 'Conteúdo demonstrativo: manutenção, atendimento, precificação e próximos passos.', 30)
 ) as template(title, description, sort_order)
 where not exists (select 1 from universe.academy_modules existing where existing.course_id=c.id);

insert into universe.academy_lessons
  (module_id, title, description, video_url, duration_minutes, sort_order, is_preview)
select m.id, lesson.title,
       'Aula demonstrativa para estruturação do curso. Substitua título, descrição e vídeo no painel administrativo.',
       'https://www.youtube.com/embed/ScMzIvxBSi4', lesson.duration, lesson.sort_order,
       lesson.sort_order = 10
  from universe.academy_modules m
 cross join (values
   ('Visão geral do módulo', 12, 10),
   ('Demonstração prática', 24, 20),
   ('Checklist e exercício', 15, 30)
 ) as lesson(title, duration, sort_order)
 where not exists (select 1 from universe.academy_lessons existing where existing.module_id=m.id);

update universe.modules
   set status='active', base_url='https://academy.carolsol.com.br'
 where key='academy';

create table portal_user
(
    id        integer generated always as identity (maxvalue 45234234)
        primary key,
    user_name text,
    password  text,
    sicil     integer,
    is_active boolean     default true,
    is_delete boolean     default false,
    rol       varchar(20) default 'kullanici'::character varying
        constraint portal_user_rol_check
            check ((rol)::text = ANY
                   ((ARRAY ['kullanici'::character varying, 'yonetici'::character varying, 'admin'::character varying])::text[]))
);

alter table portal_user
    owner to postgres;

create index idx_portal_user_active
    on portal_user (is_active, is_delete);

create table portal_departman
(
    id            integer generated always as identity
        constraint departmanlar_pkey
            primary key,
    departman_adi text not null
);

alter table portal_departman
    owner to postgres;

create table portal_departman_users
(
    id            integer generated always as identity (maxvalue 45234234)
        primary key,
    department_id integer,
    sicil         integer,
    status        integer,
    type          integer,
    ust_amir      integer,
    proje         text,
    is_delete     boolean default false,
    is_active     boolean default true,
    gorev_yeri    text
);

comment on column portal_departman_users.status is '0->yönetici
1->müdür
4->takım lideri
5->Lider
6->Amir
2->Mühendis
7->İaderi Personel
3->Teknisyen
';

comment on column portal_departman_users.type is '0->ANA GÖREV
1->VEKALET';

alter table portal_departman_users
    owner to postgres;

create index idx_portal_departman_users_active
    on portal_departman_users (is_active, is_delete);

create index idx_portal_departman_users_department
    on portal_departman_users (department_id);

create index idx_portal_departman_users_sicil
    on portal_departman_users (sicil);

create table gk_yetki_list
(
    id      integer generated always as identity (maxvalue 45234234)
        primary key,
    rol_adi text
);

alter table gk_yetki_list
    owner to postgres;

create table gk_yetkilendirme
(
    id      integer generated always as identity (maxvalue 45234234)
        primary key,
    user_id integer
        constraint fk_user
            references portal_user
            on delete cascade,
    rol_id  integer
        constraint fk_rol
            references gk_yetki_list
            on delete cascade,
    constraint uk_user_rol
        unique (user_id, rol_id)
);

alter table gk_yetkilendirme
    owner to postgres;

create table portal_anket
(
    id           integer generated always as identity (maxvalue 45234234)
        primary key,
    title        text,
    aciklama     text,
    start_date   date,
    start_time   time with time zone,
    finish_date  date,
    finish_time  time with time zone,
    is_deleted   boolean   default false,
    is_active    boolean   default true,
    created_date timestamp default '2024-10-04 10:07:02.217332'::timestamp without time zone,
    updated_date timestamp default '2024-10-04 10:07:02.217332'::timestamp without time zone,
    status       boolean,
    creator_id   integer,
    anket_tur    integer   default 0,
    soru_id      integer
);

comment on column portal_anket.anket_tur is '0->normal anket
1->video eğitim sonu anket(soru Cevap)
2->iç eğitim sonu anket(soru Cevap)';

alter table portal_anket
    owner to postgres;

create table portal_anket_birim
(
    id            integer generated always as identity (maxvalue 45234234)
        primary key,
    department_id integer,
    anket_id      integer,
    description   text,
    is_delete     boolean default false
);

alter table portal_anket_birim
    owner to postgres;

create table portal_anket_sorular
(
    id            integer generated always as identity (maxvalue 45234234)
        primary key,
    title         text,
    duration      text,
    is_deleted    boolean   default false,
    is_active     boolean   default true,
    created_date  timestamp default '2024-10-04 10:31:26.884656'::timestamp without time zone,
    updated_date  timestamp default '2024-10-04 10:31:26.884656'::timestamp without time zone,
    soru_type     integer,
    is_imperative boolean,
    anket_id      integer
);

comment on column portal_anket_sorular.soru_type is '0->Çoktan Seçmeli
1->Tekil Seçim
2->Doğrusal Ölçek
3->Açık Uçlu';

alter table portal_anket_sorular
    owner to postgres;

create table portal_anket_soru_siklari
(
    id         integer generated always as identity (maxvalue 45234234)
        primary key,
    is_deleted boolean default false,
    is_active  boolean default true,
    answer     text,
    anket_id   integer,
    soru_id    integer
);

alter table portal_anket_soru_siklari
    owner to postgres;

create table portal_anket_user
(
    id                integer generated always as identity (maxvalue 45234234)
        primary key,
    user_id           integer,
    anket_id          integer,
    created_date      timestamp default '2024-10-04 10:36:55.591458'::timestamp without time zone,
    update_date       timestamp default '2024-10-04 10:36:55.591458'::timestamp without time zone,
    user_name         text,
    egitim_katilim_id integer
);

alter table portal_anket_user
    owner to postgres;

create table portal_anket_user_answer
(
    id            integer generated always as identity (maxvalue 45234234)
        primary key,
    soru_id       integer,
    anket_user_id integer,
    answer        text,
    answer_id     integer,
    created_date  timestamp,
    anket_id      integer
);

alter table portal_anket_user_answer
    owner to postgres;

create table portal_anket_dokuman
(
    id           integer generated always as identity (maxvalue 45234234)
        primary key,
    type         integer,
    connected_id integer,
    is_deleted   boolean default false,
    url          text,
    is_active    boolean default true
);

comment on column portal_anket_dokuman.type is '0->Anket
1->Soru
2->Şık';

alter table portal_anket_dokuman
    owner to postgres;


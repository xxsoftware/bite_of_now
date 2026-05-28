#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_sql::Migration;

fn main() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: r#"
                CREATE TABLE IF NOT EXISTS recipes (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    cuisine TEXT NOT NULL,
                    flavor TEXT NOT NULL,
                    difficulty TEXT NOT NULL,
                    time INTEGER NOT NULL,
                    calories INTEGER NOT NULL,
                    best_season TEXT NOT NULL,
                    ingredients TEXT NOT NULL,
                    steps TEXT NOT NULL,
                    tips TEXT,
                    video TEXT
                );

                CREATE TABLE IF NOT EXISTS diet_records (
                    id TEXT PRIMARY KEY,
                    date TEXT NOT NULL,
                    recipe_id TEXT NOT NULL,
                    meal_type TEXT NOT NULL,
                    fullness TEXT NOT NULL,
                    mood TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS shopping_items (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL,
                    checked INTEGER NOT NULL DEFAULT 0,
                    source_recipe TEXT
                );

                CREATE TABLE IF NOT EXISTS app_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS disliked_recipes (
                    name TEXT PRIMARY KEY
                );

                CREATE TABLE IF NOT EXISTS daily_recommendation (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    breakfast_id TEXT,
                    lunch_id TEXT,
                    dinner_id TEXT,
                    snack_id TEXT,
                    season_tag TEXT,
                    cuisine_tag TEXT,
                    total_calories INTEGER,
                    macros TEXT,
                    date TEXT
                );
            "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_cover_image_to_recipes",
            sql: r#"
                ALTER TABLE recipes ADD COLUMN cover_image TEXT;
            "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "enhance_disliked_and_daily_rec",
            sql: r#"
                -- Enhance disliked_recipes with expiry and count
                CREATE TABLE IF NOT EXISTS disliked_recipes_v2 (
                    name TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    count INTEGER NOT NULL DEFAULT 1,
                    type TEXT NOT NULL DEFAULT 'soft',
                    dimension TEXT,
                    expires_at TEXT
                );

                INSERT OR IGNORE INTO disliked_recipes_v2 (name, created_at, count, type, dimension, expires_at)
                SELECT name, datetime('now'), 1, 'soft', NULL, datetime('now', '+7 days') FROM disliked_recipes;

                DROP TABLE IF EXISTS disliked_recipes;
                ALTER TABLE disliked_recipes_v2 RENAME TO disliked_recipes;

                -- Enhance daily_recommendation with full cache fields
                ALTER TABLE daily_recommendation ADD COLUMN season_tag TEXT;
                ALTER TABLE daily_recommendation ADD COLUMN cuisine_tag TEXT;
                ALTER TABLE daily_recommendation ADD COLUMN total_calories INTEGER;
                ALTER TABLE daily_recommendation ADD COLUMN macros TEXT;
                ALTER TABLE daily_recommendation ADD COLUMN reasons TEXT;
            "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_favorites_ratings_and_nullable_recipe_id",
            sql: r#"
                -- favorites table
                CREATE TABLE IF NOT EXISTS favorites (
                    recipe_id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                );

                -- ratings table
                CREATE TABLE IF NOT EXISTS ratings (
                    id TEXT PRIMARY KEY,
                    recipe_id TEXT NOT NULL,
                    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
                    date TEXT NOT NULL
                );

                -- diet_records: make recipe_id nullable and add recipe_name fallback
                CREATE TABLE IF NOT EXISTS diet_records_v2 (
                    id TEXT PRIMARY KEY,
                    date TEXT NOT NULL,
                    recipe_id TEXT,
                    recipe_name TEXT,
                    meal_type TEXT NOT NULL,
                    fullness TEXT NOT NULL,
                    mood TEXT NOT NULL
                );

                INSERT INTO diet_records_v2 (id, date, recipe_id, recipe_name, meal_type, fullness, mood)
                SELECT dr.id, dr.date, dr.recipe_id, r.name, dr.meal_type, dr.fullness, dr.mood
                FROM diet_records dr
                LEFT JOIN recipes r ON dr.recipe_id = r.id;

                DROP TABLE diet_records;
                ALTER TABLE diet_records_v2 RENAME TO diet_records;
            "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "add_custom_menu_and_special_day_marks",
            sql: r#"
                -- custom_daily_menu: user-defined daily menu
                CREATE TABLE IF NOT EXISTS custom_daily_menu (
                    date TEXT PRIMARY KEY,
                    breakfast_id TEXT,
                    lunch_id TEXT,
                    dinner_id TEXT,
                    snack_id TEXT,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                );

                -- special_day_marks: mark special dates
                CREATE TABLE IF NOT EXISTS special_day_marks (
                    date TEXT PRIMARY KEY,
                    mark_type TEXT NOT NULL,
                    note TEXT
                );
            "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:bite_of_now.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_stronghold::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

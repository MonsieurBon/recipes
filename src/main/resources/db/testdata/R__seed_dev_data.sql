-- Dev-only sample users. Every account's password is `password`.

DELETE FROM users
WHERE id BETWEEN 900001 AND 900999
   OR username IN ('Fabian', 'claude-e2e', 'claude-admin');

INSERT INTO users (id, username, email, password, roles, token_version, preferred_language)
VALUES
  (900001, 'Fabian',         'fabian@example.com',         '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER", "ADMIN"]', 0, 'GERMAN'),
  (900002, 'claude-e2e',     'claude-e2e@example.com',     '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'GERMAN'),
  (900003, 'claude-admin',   'claude-admin@example.com',   '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER", "ADMIN"]', 0, 'GERMAN'),
  (900004, 'david.roth',     'david.roth@example.com',     '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'GERMAN'),
  (900005, 'elena.frei',     'elena.frei@example.com',     '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER", "ADMIN"]', 0, 'ITALIAN'),
  (900006, 'fabio.bianchi',  'fabio.bianchi@example.com',  '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'ITALIAN'),
  (900007, 'greta.huber',    'greta.huber@example.com',    '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'GERMAN'),
  (900008, 'hans.brunner',   'hans.brunner@example.com',   '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'GERMAN'),
  (900009, 'ines.moser',     'ines.moser@example.com',     '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'FRENCH'),
  (900010, 'jonas.widmer',   'jonas.widmer@example.com',   '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'GERMAN'),
  (900011, 'karin.baumann',  'karin.baumann@example.com',  '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'ENGLISH'),
  (900012, 'luca.ferrari',   'luca.ferrari@example.com',   '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'ITALIAN'),
  (900013, 'mara.graf',      'mara.graf@example.com',      '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'GERMAN'),
  (900014, 'noah.schmid',    'noah.schmid@example.com',    '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'GERMAN'),
  (900015, 'olivia.kern',    'olivia.kern@example.com',    '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'ENGLISH'),
  (900016, 'pascal.vogel',   'pascal.vogel@example.com',   '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'FRENCH'),
  (900017, 'quirin.hofer',   'quirin.hofer@example.com',   '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'GERMAN'),
  (900018, 'rahel.steiner',  'rahel.steiner@example.com',  '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'GERMAN'),
  (900019, 'samuel.koch',    'samuel.koch@example.com',    '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'GERMAN'),
  (900020, 'tanja.lang',     'tanja.lang@example.com',     '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER", "ADMIN"]', 0, 'GERMAN'),
  (900021, 'urs.gerber',     'urs.gerber@example.com',     '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'GERMAN'),
  (900022, 'vera.marti',     'vera.marti@example.com',     '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'FRENCH'),
  (900023, 'walter.zbinden', 'walter.zbinden@example.com', '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'GERMAN'),
  (900024, 'xenia.arnold',   'xenia.arnold@example.com',   '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'ENGLISH'),
  (900025, 'yannick.good',   'yannick.good@example.com',   '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'GERMAN'),
  (900026, 'zoe.wenger',     'zoe.wenger@example.com',     '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'ITALIAN'),
  (900027, 'aaron.frick',    'aaron.frick@example.com',    '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'GERMAN'),
  (900028, 'bianca.roos',    'bianca.roos@example.com',    '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'FRENCH'),
  (900029, 'cedric.stucki',  'cedric.stucki@example.com',  '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'GERMAN'),
  (900030, 'diana.probst',   'diana.probst@example.com',   '$2a$10$eiXBPcs4RcW8NQPWSbXZFuG7z1uZ98.OGvBF5S7TEA1PnMswJKawK', '["USER"]',          0, 'GERMAN');

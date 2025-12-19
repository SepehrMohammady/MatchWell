# MatchWell Leaderboard Backend Setup

## Quick Setup

### 1. Upload Files
Upload the entire `leaderboard` folder to your server at:
```
/semolab/matchwell/leaderboard/
```

### 2. Create Database
Run `schema.sql` in your MySQL database:
```bash
mysql -u your_user -p your_database < schema.sql
```

### 3. Configure Database
Edit `config.php` and update these values:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'your_database_name');
define('DB_USER', 'your_database_user');
define('DB_PASS', 'your_database_password');
```

### 4. Test API
Test if it's working:
```bash
curl https://sepehrmohammady.ir/semolab/matchwell/leaderboard/global
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/check-username` | POST | Check username availability |
| `/register` | POST | Register new player |
| `/publish` | POST | Publish player scores |
| `/global` | GET | Get global rankings |
| `/theme/{theme}` | GET | Get theme rankings |
| `/player` | GET | Get player info |

## Security Notes
- `config.php` is blocked from web access via `.htaccess`
- All inputs are sanitized and parameterized
- CORS headers allow mobile app access

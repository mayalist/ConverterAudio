const express = require('express');
const router = express.Router();
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const connection = require('../models/db');
const path = require('path');


// Konfigurasi Multer
const storage = multer.diskStorage({
  destination: './uploads',
  filename: function(req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10000000 },
}).single('audioFile');

// Route untuk login
router.get('/', (req, res) => {
    res.render('login');
  });

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  connection.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, results) => {
    if (err) throw err;
    if (results.length > 0) {
      req.session.user = results[0];
      res.redirect('/dashboard');
    } else {
      req.flash('error_msg', 'Invalid username or password');
      res.redirect('/');
    }
  });
});

/// Route untuk dashboard
router.get('/dashboard', (req, res) => {
    if (req.session.user) {
      const userId = req.session.user.id;
      connection.query('SELECT * FROM audio_files WHERE user_id = ?', [userId], (err, results) => {
        if (err) throw err;
        res.render('dashboard', { files: results });
      });
    } else {
      res.redirect('/');
    }
  });
  

    //router uploads

    router.post('/upload', (req, res) => {
        upload(req, res, err => {
          if (err) {
            console.log(err);
            req.flash('error_msg', 'Error uploading file');
            res.redirect('/dashboard');
          } else {
            const inputFile = req.file.path;
            const outputFile = `converted-${Date.now()}.mp3`;
      
            ffmpeg(inputFile)
              .toFormat('mp3')
              .on('end', () => {
                // Simpan informasi file ke database
                const filename = outputFile;
                const fileType = 'mp3'; // Ubah sesuai format yang diinginkan
                const userId = req.session.user.id;
      
                connection.query('INSERT INTO audio_files (filename, file_type, user_id) VALUES (?, ?, ?)', [filename, fileType, userId], (err, results) => {
                  if (err) throw err;
                  req.flash('success_msg', 'File uploaded and converted successfully');
                  res.redirect('/dashboard');
                });
              })
              .on('error', err => {
                console.log('Error converting file: ', err);
                req.flash('error_msg', 'Error converting file');
                res.redirect('/dashboard');
              })
              .save(`./uploads/${outputFile}`);
          }
        });
      });
      

// Route untuk konversi audio
router.post('/convert', (req, res) => {
    upload(req, res, err => {
      if (err) {
        console.log(err);
        req.flash('error_msg', 'Error uploading file');
        res.redirect('/dashboard');
      } else {
        const inputFile = req.file.path;
        const format = req.body.format;
        const outputFile = `converted-${Date.now()}.${format}`;
  
        ffmpeg(inputFile)
          .toFormat(format)
          .on('end', () => {
            // Simpan informasi file ke database
            const filename = outputFile;
            const fileType = format;
            const userId = req.session.user.id;
  
            connection.query('INSERT INTO audio_files (filename, file_type, user_id) VALUES (?, ?, ?)', [filename, fileType, userId], (err, results) => {
              if (err) throw err;
              req.flash('success_msg', 'File uploaded and converted successfully');
              res.redirect('/dashboard');
            });
          })
          .on('error', err => {
            console.log('Error converting file: ', err);
            req.flash('error_msg', 'Error converting file');
            res.redirect('/dashboard');
          })
          .save(`./uploads/${outputFile}`);
      }
    });
  });

  // Route untuk unduh file
router.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads', filename);
    res.download(filePath);
  });

module.exports = router;

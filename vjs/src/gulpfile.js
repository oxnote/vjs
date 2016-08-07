(function(){
    'use strict';
    
var banner = [
    '/**',
    ' * oxnote VFramemaker 1.0.0',
    ' * V-FrameMaker Router-Message Applied Package',
    '<% if(typeof(theme) !== "undefined") {%> * \n * <%= theme %>\n *<% } else { %> * <% } %>',
    // ' * ',
    ' * http://git.iconv.kr',
    ' * ',
    ' * Copyright <%= date.year %>, Moosun Ahn',
    ' * The iconv.kr',
    ' * http://www.iconv.kr/',
    ' * ',
    ' * Released on: <%= date.month %> <%= date.day %>, <%= date.year %>',
    ' */',
    ''].join('\n');    
var date = {
    year: new Date().getFullYear(),
    month: ('January February March April May June July August September October November December').split(' ')[new Date().getMonth()],
    day: new Date().getDate()
    };
    
var gulp = require('gulp'), 
    connect = require('gulp-connect'),
    open = require('gulp-open'),
    rename = require('gulp-rename'),
    header = require('gulp-header'),
    path = require('path'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    sourcemaps = require('gulp-sourcemaps'),
    minifyCSS = require('gulp-minify-css'),
    fs = require('fs');
    
var v = {
  filename : 'v',
  files :[
    'v.base.root.js',
    'v.base.get.js',
    'v.base.elements.js',
    'v.base.compiler.js',
    'v.base.context.js',
    'v.base.render.js',
    'v.base.controller.js',
    'v.base.router.js',
    'v.base.message.js',
    'v.dev.js'
    ],
  sec :[
    'v.sec.get.js'
    ],
  ani : [
    'v.ani.shifty.js',
    'v.ani.mate.js'
  ],
  i18n : [
    'v.base.i18n.js',
  ],
  ie : [
    'js-ie/classList-ie9.js',
    'js-ie/html5shiv.js',
    'js-ie/history-ie8.js',
    'js-ie/transition-ie.js',
    'js-ie/tokenizer.js',
    'js-ie/parser.js'
  ]
};

gulp.task('ie', function(){
  gulp.src(v.ie)
    .pipe(concat('v-ie.js'))
    .pipe(sourcemaps.init())
    .pipe(uglify())
    .pipe(header(banner, { date: date }))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('dist/'));  

  gulp.src(['dist/v-ie.js','dist/v-ie.map'])
    .pipe(gulp.dest('../app/www/lib/'));
    
});

gulp.task('dist', function(){
  gulp.src(v.files)
    .pipe(concat(v.filename + '.core.v2.js'))
    .pipe(header(banner, { date: date }))
    .pipe(gulp.dest('dist/'));

  gulp.src(v.i18n)
    .pipe(concat(v.filename + '.i18n.v2.js'))
    .pipe(header(banner, { date: date }))
    .pipe(gulp.dest('dist/'));

  gulp.src(v.sec)
    .pipe(concat(v.filename + '.sec.v2.js'))
    .pipe(header(banner, { date: date }))
    .pipe(gulp.dest('dist/'));
    

  gulp.src(v.ani)
    .pipe(concat(v.filename + '.ani.v2.js'))
    .pipe(header(banner, { date: date }))
    .pipe(gulp.dest('dist/'));    
    
});
      
gulp.task('min', function(){
  gulp.src(v.files)
    .pipe(concat(v.filename + '.core.v2.min.js'))
    .pipe(sourcemaps.init())
    .pipe(uglify())
    .pipe(header(banner, { date: date }))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('dist/'));

  gulp.src(v.i18n)
    .pipe(concat(v.filename + '.i18n.v2.min.js'))
    .pipe(sourcemaps.init())
    .pipe(uglify())
    .pipe(header(banner, { date: date }))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('dist/'));

  gulp.src(v.sec)
    .pipe(concat(v.filename + '.sec.v2.min.js'))
    .pipe(sourcemaps.init())
    .pipe(uglify())
    .pipe(header(banner, { date: date }))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('dist/'));
    

  gulp.src(v.ani)
    .pipe(concat(v.filename + '.ani.v2.min.js'))
    .pipe(sourcemaps.init())
    .pipe(uglify())
    .pipe(header(banner, { date: date }))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('dist/'));    
    
});
      
gulp.task('default', ['dist', 'min']);

})();

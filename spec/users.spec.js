const mongoose = require('mongoose');
const supertest = require('supertest');
const app = require('../app');
const User = require('../models/user');


const { expect } = require('chai');
const { cleanUpDatabase } = require('./utils');

beforeEach(cleanUpDatabase);

describe('POST /users', function() {

  it('should create a user', async function() {

  	let randomString = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  	randomString = '"' + randomString + '"';

  	const res = await supertest(app)
	  .post('/users')
	  .send({
	  	username : "JohnDoe",
  		email : "johndoe@gmail.com",
  		password: "12346789",
  		imgProfil: "johnintheforest.jpg"
  		})
	  .expect(201)
	  .expect('Content-Type', /json/)

	expect(res.body).to.be.an('object');
	expect(res.body._id).to.be.a('string');
	expect(res.body.username).to.equal('JohnDoe');
	expect(res.body.email).to.equal('johndoe@gmail.com');
	expect(res.body.imgProfil).to.equal('johnintheforest.jpg');
	expect(res.body).to.have.all.keys('_id', 'username', 'email','imgProfil', '__v');
  });
});

describe('GET /users', function() {

	beforeEach(async function() {
    	await Promise.all([
      	User.create({ username: 'JohnDoe', email: "johndoe@gmail.com", password: "123456789", imgProfil: "johnintheforest.jpg"}),
      	User.create({ username: 'JaneDoe', email: "janedoe@gmail.com", password: "123456789", imgProfil: "janeintheforest.jpg"})
    ]);
  });

  it('should retrieve the list of users', async function() {
	const res = await supertest(app)
	.get('/users')
	.expect(200)
	.expect('Content-Type', /json/);

	expect(res.body).to.be.an('array');
	expect(res.body).to.have.lengthOf(2);

	expect(res.body[1]).to.be.an('object');
	expect(res.body[1]._id).to.be.a('string');
	expect(res.body[1].username).to.equal('JohnDoe');
	expect(res.body[1].email).to.equal('johndoe@gmail.com');
	expect(res.body[1].imgProfil).to.equal('johnintheforest.jpg');
	expect(res.body[1]).to.have.all.keys('_id', 'username', 'email','imgProfil', '__v');

	expect(res.body[0]).to.be.an('object');
	expect(res.body[0]._id).to.be.a('string');
	expect(res.body[0].username).to.equal('JaneDoe');
	expect(res.body[0].email).to.equal('janedoe@gmail.com');
	expect(res.body[0].imgProfil).to.equal('janeintheforest.jpg');
	expect(res.body[0]).to.have.all.keys('_id', 'username', 'email','imgProfil', '__v');
  });
});

after(mongoose.disconnect);
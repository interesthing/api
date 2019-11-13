const mongoose = require('mongoose');
const supertest = require('supertest');
const app = require('../app');
const User = require('../models/user');

const jwt = require('jsonwebtoken');
const secretKey = process.env.SECRET_KEY || 'changeme';

const { expect } = require('chai');
const { cleanUpUserDatabase } = require('./utils');

beforeEach(cleanUpUserDatabase);

describe('POST /users', function() {

  it('should create a user', async function(){

  	const res = await supertest(app)
	  .post('/users/')
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

describe('GET /users', function(){

	beforeEach(async function() {

    	await Promise.all([
      	User.create({username: 'JohnDoe',
      				 email: "johndoe@gmail.com",
      				 password: "123456789",
      				 imgProfil: "johnintheforest.jpg"}),

      	User.create({username: 'JaneDoe',
      				 email: "janedoe@gmail.com",
      				 password: "123456789",
      				 imgProfil: "janeintheforest.jpg"})
    ]);
  });

  it('should retrieve the list of users', async function(){
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

describe('DELETE /users/:id', function(){

	let user;

	// 1. Create an user
    beforeEach(async function(){
    	user = await User.create({ 	username: 'JohnDoe',
    								email: "johndoe@gmail.com",
    								password: "123456789", 
    								imgProfil: "johnintheforest.jpg"})
    });

	it('should delete an user', async function(){

		const exp = (new Date().getTime() + 1 * 24 * 3600 * 1000) / 1000;
    	const claims = { sub: user._id.toString(), exp: exp };
    	
    	// 2. Create the user's JWT
		let user_jwt = jwt.sign(claims, secretKey);

		// 3. Delete the user
    	const res = await supertest(app)
    		.delete('/users/'+ user._id)
    		.set('Authorization', 'Bearer ' + user_jwt)
            .expect(204)

            expect(res.body).to.eql({});
    	});
	});

describe('PUT /users/:id', function(){

	let user;
	// 1. Create an user
    beforeEach(async function(){
    	user = await User.create({ username: 'JohnDoe', email: "johndoe@gmail.com", password: "123456789", imgProfil: "johnintheforest.jpg"})
    });

	it('should update(PUT) an user', async function(){

		const exp = (new Date().getTime() + 1 * 24 * 3600 * 1000) / 1000;
    	const claims = { sub: user._id.toString(), exp: exp };
    	
    	// 2. Create the user's JWT
		let user_jwt = jwt.sign(claims, secretKey);

		// 3. Delete the user
    	const res = await supertest(app)
    		.put('/users/'+ user._id)
    		.set('Authorization', 'Bearer ' + user_jwt)
    		.send({
			  	username : "JaneDoe",
		  		email : "janedoe@gmail.com",
		  		password : "123456789",
		  		imgProfil: "janeintheforest.jpg"
		  	})
            .expect(200)
            .expect('Content-Type', /json/);

            expect(res.body).to.be.an('object');
			expect(res.body._id).to.be.a('string');
			expect(res.body.username).to.equal('JaneDoe');
			expect(res.body.email).to.equal('janedoe@gmail.com');
			expect(res.body.imgProfil).to.equal('janeintheforest.jpg');
			expect(res.body).to.have.all.keys('_id', 'username', 'email','imgProfil', '__v');
    	});
	});

after(mongoose.disconnect);
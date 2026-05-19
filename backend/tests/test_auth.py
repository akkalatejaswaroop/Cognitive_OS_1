import pytest
from app.models.domain import User

def test_signup_success(client):
    response = client.post(
        "/api/v1/auth/signup",
        json={"email": "testuser@example.com", "password": "securepassword123"}
    )
    assert response.status_code == 200
    assert response.json() == {"message": "User created successfully"}

def test_signup_already_registered(client):
    # First sign up
    client.post(
        "/api/v1/auth/signup",
        json={"email": "duplicate@example.com", "password": "password123"}
    )
    # Attempt second sign up
    response = client.post(
        "/api/v1/auth/signup",
        json={"email": "duplicate@example.com", "password": "differentpassword"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"

def test_login_success(client):
    # Sign up first
    client.post(
        "/api/v1/auth/signup",
        json={"email": "loginuser@example.com", "password": "mypassword"}
    )
    # Login
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "loginuser@example.com", "password": "mypassword"}
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Login successful"
    assert "user" in response.json()
    assert response.json()["user"]["email"] == "loginuser@example.com"
    
    # Check that HTTP-only cookies are set
    assert "access_token" in response.cookies
    assert "refresh_token" in response.cookies

def test_login_invalid_credentials(client):
    # Sign up
    client.post(
        "/api/v1/auth/signup",
        json={"email": "wrongpwd@example.com", "password": "correctpassword"}
    )
    # Login with incorrect password
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "wrongpwd@example.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"

def test_logout(client):
    # Login first
    client.post(
        "/api/v1/auth/signup",
        json={"email": "logoutuser@example.com", "password": "password"}
    )
    client.post(
        "/api/v1/auth/login",
        json={"email": "logoutuser@example.com", "password": "password"}
    )
    # Logout
    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert response.json() == {"message": "Logged out successfully"}

def test_get_me_success(client):
    email = "me@example.com"
    client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "password"}
    )
    client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "password"}
    )
    
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 200
    assert response.json()["email"] == email

def test_refresh_token_success(client):
    email = "refresh@example.com"
    client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "password"}
    )
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "password"}
    )
    
    # Get refresh token from cookie
    refresh_token = login_res.cookies.get("refresh_token")
    
    # Call refresh
    response = client.post("/api/v1/auth/refresh")
    assert response.status_code == 200
    assert response.json()["message"] == "Token refreshed"
    assert "access_token" in response.cookies

// src/App.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import Login from "./components/Login";
import Routine from "./components/Routine";
import Character from "./components/Character";
import Ranking from "./components/Ranking";
import "./index.css"; // 필요 스타일

// ---------------------------------------
// Google Apps Script 웹앱 URL (Login.js와 동일)
// ---------------------------------------
const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbwS5isKVX48cuAkafURvGgLDh2AIpZhHWTBxob_mHVsKQ14f53BwE4jCOGjg6_8VGjBfA/exec";

function App() {
    // 이제 currentUserId는 “users” 시트의 id (timestamp) 입니다.
    const [currentUserId, setCurrentUserId] = useState(null);
    // 로그인한 유저의 “화면에 표시할 이름(username)”을 저장
    const [displayName, setDisplayName] = useState("");
    const [activeTab, setActiveTab] = useState("routine");
    const [userExp, setUserExp] = useState(0);

    // 1) 마운트 시점: localStorage 에 저장된 currentUserId 복원
    useEffect(() => {
        const savedId = localStorage.getItem("currentUserId");
        if (savedId) {
            setCurrentUserId(savedId);
            fetchUserName(savedId);
            loadUserExp(savedId);
        }
    }, []);

    // 2) currentUserId가 바뀔 때마다 userExp를 로컬에서 읽어옴
    useEffect(() => {
        if (!currentUserId) return;
        loadUserExp(currentUserId);
        const iv = setInterval(() => {
            loadUserExp(currentUserId);
        }, 1000);
        return () => clearInterval(iv);
    }, [currentUserId]);

    // 로컬스토리지에서 userExp-<userId>를 읽어서 state에 저장
    const loadUserExp = (userId) => {
        const key = `userExp-${userId}`;
        const val = parseInt(localStorage.getItem(key) || "0", 10);
        setUserExp(val);
    };

    // Google Sheets “users” 시트에서 currentUserId(id) 에 해당하는 row의 username을 가져옴
    const fetchUserName = async (userId) => {
        try {
            const res = await axios.get(SCRIPT_URL, {
                params: { action: "read", table: "users" },
                responseType: "text",
            });
            const txt = res.data;
            let allUsers = [];
            if (typeof txt === "string" && txt.startsWith("undefined(")) {
                const jsonStr = txt.slice("undefined(".length, -1);
                const parsed = JSON.parse(jsonStr);
                allUsers = parsed.success ? parsed.data : [];
            } else {
                const parsed = JSON.parse(txt);
                allUsers = parsed.success ? parsed.data : [];
            }
            const found = allUsers.find((row) => row.id === userId);
            if (found) {
                setDisplayName(found.username);
            }
        } catch (err) {
            console.error("users 이름 조회 오류:", err);
        }
    };

    // 3) 로그인 성공 시 호출되는 핸들러
    //    onLogin(userId, isNewUser, userName, userPassword)
    const handleLoginSuccess = (userId, isNewUser, userName, userPassword) => {
        setCurrentUserId(userId);
        setActiveTab("routine");

        // 로컬 프로틴 풀 초기화 (최초 가입 시 0, 기존 가입자면 이미 로컬에 있거나 0)
        const expKey = `userExp-${userId}`;
        if (!localStorage.getItem(expKey)) {
            localStorage.setItem(expKey, "0");
            setUserExp(0);
        }

        // 화면에 보여줄 이름
        setDisplayName(userName);

        // 신규 사용자면 서버에 이미 insert했으므로 여기서는 별도 처리 생략
    };

    // 4) 로그아웃 핸들러
    const handleLogout = () => {
        localStorage.removeItem("currentUserId");
        setCurrentUserId(null);
        setDisplayName("");
        setActiveTab("routine");
        setUserExp(0);
    };

    // 로그인 상태가 아니면, 로그인 폼만 렌더링
    if (!currentUserId) {
        return (
            <div className="login-background">
                <nav className="navbar navbar-dark bg-dark">
                    <div className="container-fluid">
                        <span className="navbar-brand">
                            FitBuddy Connection
                        </span>
                    </div>
                </nav>
                <div
                    className="d-flex justify-content-center align-items-center"
                    style={{ height: "calc(100vh - 56px)" }}
                >
                    <div className="login-card">
                        <Login onLogin={handleLoginSuccess} />
                    </div>
                </div>
            </div>
        );
    }

    // 로그인 상태일 때 메인 화면 렌더링
    return (
        <div>
            {/* 상단 네비게이션바: 브랜드명 + 내 프로틴 + 사용자 이름 + 로그아웃 */}
            <nav className="navbar navbar-dark bg-dark">
                <div className="container-fluid">
                    <span className="navbar-brand">FitBuddy Connection</span>
                    <div className="d-flex align-items-center">
                        <span className="navbar-text text-info me-4">
                            내 프로틴: <strong>{userExp}</strong>
                        </span>
                        <span className="navbar-text text-light me-3">
                            {displayName}님
                        </span>
                        <button
                            className="btn btn-outline-light btn-sm"
                            onClick={handleLogout}
                        >
                            로그아웃
                        </button>
                    </div>
                </div>
            </nav>

            {/* 콘텐츠 영역 (상단 네비 높이 56px 고려) */}
            <div
                className="container"
                style={{ paddingTop: "60px", paddingBottom: "60px" }}
            >
                {activeTab === "routine" && (
                    <Routine currentUserId={currentUserId} />
                )}
                {activeTab === "character" && (
                    <Character currentUserId={currentUserId} />
                )}
                {activeTab === "ranking" && (
                    <Ranking currentUserId={currentUserId} />
                )}
            </div>

            {/* 하단 네비게이션 */}
            <ul className="nav nav-pills nav-justified fixed-bottom bg-light">
                <li className="nav-item">
                    <button
                        className={
                            "nav-link" +
                            (activeTab === "routine" ? " active" : "")
                        }
                        onClick={() => setActiveTab("routine")}
                    >
                        루틴
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={
                            "nav-link" +
                            (activeTab === "character" ? " active" : "")
                        }
                        onClick={() => setActiveTab("character")}
                    >
                        캐릭터
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={
                            "nav-link" +
                            (activeTab === "ranking" ? " active" : "")
                        }
                        onClick={() => setActiveTab("ranking")}
                    >
                        전체 랭킹
                    </button>
                </li>
            </ul>
        </div>
    );
}

export default App;

// src/App.js
import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Routine from "./components/Routine";
import Character from "./components/Character";
import Ranking from "./components/Ranking";
import "./index.css"; // login-background, login-card 등 스타일

function App() {
    const [currentUserId, setCurrentUserId] = useState(null);
    const [activeTab, setActiveTab] = useState("routine");
    const [userExp, setUserExp] = useState(0);

    // 현재 로그인된 유저 ID가 localStorage에 있으면 복원
    useEffect(() => {
        const savedUserId = localStorage.getItem("currentUserId");
        if (savedUserId) {
            setCurrentUserId(savedUserId);
        }
    }, []);

    // currentUserId가 바뀔 때마다, 그리고 주기적으로 localStorage에서 userExp를 읽어와 state에 저장
    useEffect(() => {
        if (!currentUserId) return;

        const userExpKey = `userExp-${currentUserId}`;
        // 초기 로드
        const storedExp = parseInt(localStorage.getItem(userExpKey) || "0", 10);
        setUserExp(storedExp);

        // setInterval을 사용해 1초마다 localStorage를 체크 (너무 잦으면 성능 저하 가능하니 필요에 따라 간격 조절)
        const intervalId = setInterval(() => {
            const updated = parseInt(
                localStorage.getItem(userExpKey) || "0",
                10
            );
            setUserExp(updated);
        }, 1000);

        return () => clearInterval(intervalId);
    }, [currentUserId]);

    // 로그인 성공 시 호출되는 핸들러
    const handleLoginSuccess = (userId) => {
        setCurrentUserId(userId);
        setActiveTab("routine");
    };

    // 로그아웃 처리
    const handleLogout = () => {
        localStorage.removeItem("currentUserId");
        setCurrentUserId(null);
        setActiveTab("routine");
        setUserExp(0);
    };

    // 사용자 이름만 뽑아내는 함수 (userId = "이름__비밀번호")
    const getUserName = () => {
        if (!currentUserId) return "";
        return currentUserId.split("__")[0];
    };

    // 로그인 상태가 아니면, 배경+상단바+로그인 폼만 보여줌
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
            {/* 상단 네비게이션바: 브랜드명 + 내 EXP + 사용자 이름 + 로그아웃 */}
            <nav className="navbar navbar-dark bg-dark">
                <div className="container-fluid">
                    <span className="navbar-brand">FitBuddy Connection</span>
                    <div className="d-flex align-items-center">
                        {/* 유저 EXP 풀 표시 */}
                        <span className="navbar-text text-info me-4">
                            내 EXP: <strong>{userExp}</strong>
                        </span>
                        {/* “이름님” */}
                        <span className="navbar-text text-light me-3">
                            {getUserName()}님
                        </span>
                        {/* 로그아웃 버튼 */}
                        <button
                            className="btn btn-outline-light btn-sm"
                            onClick={handleLogout}
                        >
                            로그아웃
                        </button>
                    </div>
                </div>
            </nav>

            {/* 콘텐츠 영역 (상단 navbar 높이 56px 고려) */}
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
                {activeTab === "ranking" && <Ranking />}
            </div>

            {/* 하단 네비게이션 (nav-pills 스타일) */}
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

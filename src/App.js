import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Routine from "./components/Routine";
import Character from "./components/Character";
import Ranking from "./components/Ranking";
import "./index.css"; // 배경 이미지 스타일 등

function App() {
    const [currentUserId, setCurrentUserId] = useState(null);
    const [expForRender, setExpForRender] = useState(0);
    const [activeTab, setActiveTab] = useState("routine");

    // 페이지 로드 시, 로컬스토리지에 저장된 로그인 정보 복원
    useEffect(() => {
        const savedUserId = localStorage.getItem("currentUserId");
        if (savedUserId) {
            setCurrentUserId(savedUserId);
            const expKey = `exp-${savedUserId}`;
            const storedExp = parseInt(localStorage.getItem(expKey) || "0", 10);
            setExpForRender(storedExp);
        }
    }, []);

    const handleLoginSuccess = (userId) => {
        setCurrentUserId(userId);
        const expKey = `exp-${userId}`;
        const storedExp = parseInt(localStorage.getItem(expKey) || "0", 10);
        setExpForRender(storedExp);
        setActiveTab("routine");
    };

    const handleExpChange = (newExp) => {
        setExpForRender(newExp);
    };

    const getUserName = () => {
        if (!currentUserId) return "";
        return currentUserId.split("__")[0];
    };

    const handleLogout = () => {
        localStorage.removeItem("currentUserId");
        setCurrentUserId(null);
        setExpForRender(0);
        setActiveTab("routine");
    };

    // 로그인 안 된 상태면 로그인 화면만 렌더링
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

    // 로그인된 상태면 메인 화면 렌더링
    return (
        <div>
            {/* 상단 네비게이션바 */}
            <nav className="navbar navbar-dark bg-dark">
                <div className="container-fluid">
                    <span className="navbar-brand">FitBuddy Connection</span>
                    <div className="d-flex align-items-center">
                        <span className="navbar-text text-light me-3">
                            {getUserName()}님
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

            {/* 콘텐츠 영역(상단 navbar 높이 고려) */}
            <div
                className="container"
                style={{ paddingTop: "60px", paddingBottom: "60px" }}
            >
                {activeTab === "routine" && (
                    <Routine
                        currentUserId={currentUserId}
                        onExpChange={handleExpChange}
                    />
                )}
                {activeTab === "character" && (
                    <Character
                        currentUserId={currentUserId}
                        exp={expForRender}
                    />
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

import React, { useState } from "react";

export default function Login({ onLogin }) {
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [statusMsg, setStatusMsg] = useState("");

    // 이름+비밀번호를 합쳐서 userId로 사용
    const makeUserId = (n, p) => `${n}__${p}`;

    const handleLogin = () => {
        if (!name.trim() || !password.trim()) {
            alert("이름과 비밀번호를 모두 입력해주세요.");
            return;
        }

        const userId = makeUserId(name.trim(), password.trim());
        const users = JSON.parse(localStorage.getItem("users") || "{}");

        if (!users[userId]) {
            // 신규 사용자 등록
            users[userId] = true;
            localStorage.setItem("users", JSON.stringify(users));
        }

        localStorage.setItem("currentUserId", userId);
        setStatusMsg(`${name.trim()}님, 환영합니다!`);
        onLogin(userId);
    };

    return (
        <div className="text-center">
            <h2 className="fw-bold">간단 로그인</h2>
            <input
                type="text"
                className="form-control w-50 mx-auto mb-2"
                placeholder="이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
            <input
                type="password"
                className="form-control w-50 mx-auto mb-3"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handleLogin}>
                로그인 / 신규 사용자 등록
            </button>
            {statusMsg && <p className="mt-2 text-success">{statusMsg}</p>}
        </div>
    );
}

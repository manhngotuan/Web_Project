import React from "react";
import './NewsLetter.css'
const NewsLetter = () => {
    return (
        <div className="newsletter">
            <h1>Nhận ưu đãi độc quyền với Email của bạn</h1>
            <p>Đăng ký ngay để nhận nhiều ưu đãi</p>
            <div>
                <input type ="email" placeholder="Email của bạn"/>
                <button>Đăng ký</button>
            </div>
        </div>
    )
}

export default NewsLetter
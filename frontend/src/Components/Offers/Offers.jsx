import React from "react";
import './Offers.css'
import exclusive_image from '../Assets/exclusive_image.png'
const Offers = () => {
    return (
        <div className="offers">
            <div className="offers-left">
                <h1>Duy nhất</h1>
                <h1>Dành riêng cho bạn</h1>
                <p>Chỉ có trên các sản phẩm bán chạy nhất</p>
                <button>Xem ngay</button>
            </div>
            <div className="offers-right">
                <img src={exclusive_image} alt=""/>
            </div>
        </div>
    )
}

export default Offers
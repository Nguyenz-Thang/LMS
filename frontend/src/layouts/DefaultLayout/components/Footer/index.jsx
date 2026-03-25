import { Youtube, Facebook, Music2, Volume2 } from "lucide-react";
import styles from "./Footer.module.scss";
import logo from "../../../../assets/img/utt.png";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.colBrand}>
            <div className={styles.brand}>
              <img src={logo} alt="F8 Logo" className={styles.logo} />
              <h3>LMS</h3>
            </div>

            <ul className={styles.infoList}>
              <li>
                <strong>Điện thoại:</strong> 08 6541 6387
              </li>
              <li>
                <strong>Email:</strong> tatthang204@gmail.com
              </li>
              <li>
                <strong>Địa chỉ liên hệ:</strong> Số 17, ngõ 179, Phường Thanh
                Liệt, Thành phố Hà Nội
              </li>
            </ul>

            {/* <div className={styles.badges}>
              <div className={styles.badge}></div>
              <div className={styles.badgeBlue}></div>
            </div> */}
          </div>

          <div className={styles.col}>
            <h4>VỀ LMS</h4>
            <a href="/">Giới thiệu</a>
            <a href="/">Liên hệ</a>
            <a href="/">Điều khoản &amp; Quy định</a>
            <a href="/">Chính sách bảo mật</a>
          </div>

          <div className={styles.col}>
            <h4>HỖ TRỢ</h4>
            <a href="/">Chính sách thanh toán</a>
          </div>

          <div className={styles.col}>
            <h4>CÔNG CỤ</h4>
            <a href="/">Tạo</a>
          </div>

          <div className={styles.colCompany}>
            <h4>CÔNG TY CỔ PHẦN CÔNG NGHỆ GIÁO DỤC</h4>
            {/* <p>
              Địa chỉ: Tầng 4, Tòa nhà Anh Minh, số 36 Hoàng Cầu, Thành phố Hà
              Nội
            </p>
            <p>
              Mã số doanh nghiệp: 0109922901 do Chi cục Thuế Quận Đống Đa, Cục
              Thuế TP. Hà Nội cấp ngày 04/03/2022
            </p> */}
          </div>
        </div>

        <div className={styles.bottom}>
          {/* <button className={styles.soundBtn} type="button" aria-label="Sound">
            <Volume2 size={20} />
          </button> */}

          <p className={styles.copy}>
            © 2004 - 2026 LMS. Hệ thống quản lý học tập hàng đầu Việt Nam.
          </p>

          <div className={styles.socials}>
            <a href="/" aria-label="YouTube" className={styles.socialBtn}>
              <Youtube size={18} />
            </a>
            <a href="/" aria-label="Facebook" className={styles.socialBtn}>
              <Facebook size={18} />
            </a>
            <a href="/" aria-label="TikTok" className={styles.socialBtn}>
              <Music2 size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

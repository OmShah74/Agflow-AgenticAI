from agno.tools import Toolkit
import smtplib
from email.mime.text import MIMEText

class SimpleGmailTools(Toolkit):
    def __init__(self, sender_email: str, app_password: str):
        super().__init__(name="gmail_tools")
        self.sender_email = sender_email
        self.password = app_password
        self.register(self.send_email)

    def send_email(self, receiver_email: str, subject: str, body: str):
        try:
            msg = MIMEText(body)
            msg['Subject'] = subject
            msg['From'] = self.sender_email
            msg['To'] = receiver_email
            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp_server:
                smtp_server.login(self.sender_email, self.password)
                smtp_server.sendmail(self.sender_email, receiver_email, msg.as_string())
            return "Email sent successfully."
        except Exception as e:
            return f"Failed to send email: {e}"